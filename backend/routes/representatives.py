"""
Representative System Routes - iToke Platform
Admin CRUD, Dashboard, Referral Tracking, Contract, Documents, Withdrawals
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import uuid

from deps import (
    db, get_current_user, get_current_representative,
    get_client_ip, validate_cnpj,
)
from models import RepresentativeCreate, RepresentativeUpdate

rep_router = APIRouter()


# ===================== ADMIN CRUD =====================

@rep_router.post("/admin/representatives")
async def create_representative(data: RepresentativeCreate, user: dict = Depends(get_current_user)):
    """Admin creates a new representative"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    cleaned_cnpj = data.cnpj.replace(".", "").replace("/", "").replace("-", "").strip()
    if not validate_cnpj(cleaned_cnpj):
        raise HTTPException(status_code=400, detail="CNPJ invalido")

    existing = await db.representatives.find_one({"cnpj": cleaned_cnpj}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ ja cadastrado como representante")

    est_with_cnpj = await db.establishments.find_one({"cnpj": cleaned_cnpj}, {"_id": 0})
    if est_with_cnpj:
        raise HTTPException(status_code=400, detail="Este CNPJ ja pertence a um estabelecimento cadastrado. Auto-indicacao nao permitida.")

    rep_id = f"rep_{uuid.uuid4().hex[:12]}"
    access_token = f"rptk_{uuid.uuid4().hex}"
    referral_code = f"REP{uuid.uuid4().hex[:6].upper()}"

    representative = {
        "rep_id": rep_id,
        "name": data.name,
        "email": data.email,
        "cnpj": cleaned_cnpj,
        "status": "active",
        "access_token": access_token,
        "referral_code": referral_code,
        "free_tokens_allocated": data.free_tokens,
        "free_tokens_used": 0,
        "commission_balance": 0.0,
        "total_earned": 0.0,
        "total_withdrawn": 0.0,
        "commission_value": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.representatives.insert_one(representative)
    representative.pop("_id", None)

    return representative


@rep_router.get("/admin/representatives")
async def list_representatives(user: dict = Depends(get_current_user)):
    """Admin lists all representatives"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    reps = await db.representatives.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

    for rep in reps:
        client_count = await db.rep_referrals.count_documents({"rep_id": rep["rep_id"], "type": "client"})
        est_count = await db.rep_referrals.count_documents({"rep_id": rep["rep_id"], "type": "establishment"})
        rep["clients_count"] = client_count
        rep["establishments_count"] = est_count

    return reps


@rep_router.put("/admin/representatives/{rep_id}")
async def update_representative(rep_id: str, data: RepresentativeUpdate, user: dict = Depends(get_current_user)):
    """Admin updates a representative"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    rep = await db.representatives.find_one({"rep_id": rep_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Representante nao encontrado")

    update = {"updated_at": datetime.now(timezone.utc)}
    if data.name is not None:
        update["name"] = data.name
    if data.email is not None:
        update["email"] = data.email
    if data.cnpj is not None:
        cleaned = data.cnpj.replace(".", "").replace("/", "").replace("-", "").strip()
        if cleaned and not validate_cnpj(cleaned):
            raise HTTPException(status_code=400, detail="CNPJ invalido")
        update["cnpj"] = cleaned
    if data.status is not None:
        if data.status not in ["active", "suspended", "pending"]:
            raise HTTPException(status_code=400, detail="Status invalido")
        update["status"] = data.status
    if data.free_tokens_to_add is not None and data.free_tokens_to_add > 0:
        update["free_tokens_allocated"] = rep.get("free_tokens_allocated", 0) + data.free_tokens_to_add
    if data.commission_value is not None:
        update["commission_value"] = data.commission_value

    await db.representatives.update_one({"rep_id": rep_id}, {"$set": update})

    updated = await db.representatives.find_one({"rep_id": rep_id}, {"_id": 0})
    return updated


@rep_router.get("/admin/rep-commission-settings")
async def get_rep_commission_settings(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    settings = await db.platform_settings.find_one({"key": "rep_commission_value"}, {"_id": 0})
    return {"commission_value": settings.get("value", 1.00) if settings else 1.00}


@rep_router.put("/admin/rep-commission-settings")
async def update_rep_commission_settings(request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    value = body.get("commission_value", 1.00)
    await db.platform_settings.update_one(
        {"key": "rep_commission_value"},
        {"$set": {"key": "rep_commission_value", "value": float(value)}},
        upsert=True
    )
    return {"commission_value": value}


# ===================== REFERRAL TRACKING =====================

@rep_router.get("/rep/check-referral/{referral_code}")
async def check_rep_referral(referral_code: str, email: str = ""):
    """Public: Check if a representative referral code is valid"""
    rep = await db.representatives.find_one(
        {"referral_code": referral_code, "status": "active"},
        {"_id": 0, "rep_id": 1, "name": 1, "referral_code": 1}
    )
    if not rep:
        raise HTTPException(status_code=404, detail="Codigo de representante invalido ou inativo")

    already_registered = False
    if email:
        existing_user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
        if existing_user:
            already_registered = True

    return {
        "valid": True,
        "rep_name": rep["name"],
        "already_registered": already_registered,
        "message": "Usuario ja cadastrado na plataforma" if already_registered else ""
    }


@rep_router.post("/rep/link-referral")
async def link_rep_referral(request: Request):
    """Link a new user or establishment to a representative"""
    body = await request.json()
    referral_code = body.get("referral_code")
    user_id = body.get("user_id")
    establishment_id = body.get("establishment_id")
    link_type = body.get("type", "client")

    if not referral_code:
        raise HTTPException(status_code=400, detail="Codigo de referencia obrigatorio")

    rep = await db.representatives.find_one(
        {"referral_code": referral_code, "status": "active"},
        {"_id": 0}
    )
    if not rep:
        raise HTTPException(status_code=404, detail="Representante nao encontrado")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=365)

    if link_type == "client" and user_id:
        existing = await db.rep_referrals.find_one({"user_id": user_id}, {"_id": 0})
        if existing:
            return {"linked": False, "reason": "already_linked", "message": "Este usuario ja esta vinculado a outro representante ou rede"}

        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user_doc and user_doc.get("referred_by_id"):
            return {"linked": False, "reason": "already_referred", "message": "Este usuario ja foi indicado por outra pessoa"}

        await db.rep_referrals.insert_one({
            "referral_id": f"repref_{uuid.uuid4().hex[:12]}",
            "rep_id": rep["rep_id"],
            "user_id": user_id,
            "type": "client",
            "created_at": now,
            "expires_at": expires_at,
        })
        return {"linked": True, "message": "Cliente vinculado ao representante"}

    elif link_type == "establishment" and establishment_id:
        existing = await db.rep_referrals.find_one({"establishment_id": establishment_id}, {"_id": 0})
        if existing:
            return {"linked": False, "reason": "already_linked", "message": "Este estabelecimento ja esta vinculado a outro representante ou rede"}

        est = await db.establishments.find_one({"establishment_id": establishment_id}, {"_id": 0})
        if est and est.get("cnpj") == rep.get("cnpj"):
            return {"linked": False, "reason": "self_referral", "message": "Auto-indicacao nao permitida (CNPJ igual)"}

        await db.rep_referrals.insert_one({
            "referral_id": f"repref_{uuid.uuid4().hex[:12]}",
            "rep_id": rep["rep_id"],
            "establishment_id": establishment_id,
            "type": "establishment",
            "created_at": now,
            "expires_at": expires_at,
        })
        return {"linked": True, "message": "Estabelecimento vinculado ao representante"}

    raise HTTPException(status_code=400, detail="Dados insuficientes para vincular")


# ===================== REPRESENTATIVE DASHBOARD =====================

@rep_router.get("/rep/dashboard")
async def get_rep_dashboard(rep: dict = Depends(get_current_representative)):
    """Get representative dashboard data"""
    rep_id = rep["rep_id"]
    now = datetime.now(timezone.utc)

    clients = await db.rep_referrals.find({"rep_id": rep_id, "type": "client"}, {"_id": 0}).to_list(500)
    establishments = await db.rep_referrals.find({"rep_id": rep_id, "type": "establishment"}, {"_id": 0}).to_list(500)

    active_clients = [c for c in clients if c.get("expires_at", now) > now]
    active_establishments = [e for e in establishments if e.get("expires_at", now) > now]

    recent_commissions = await db.rep_commissions.find({"rep_id": rep_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    for c in recent_commissions:
        if isinstance(c.get("created_at"), datetime):
            c["created_at"] = c["created_at"].isoformat()

    free_allocated = rep.get("free_tokens_allocated", 0)
    free_used = rep.get("free_tokens_used", 0)
    free_remaining = max(0, free_allocated - free_used)

    est_details = []
    for e in active_establishments:
        est = await db.establishments.find_one(
            {"establishment_id": e.get("establishment_id")},
            {"_id": 0, "business_name": 1, "category": 1}
        )
        est_details.append({
            "establishment_id": e.get("establishment_id"),
            "name": est.get("business_name", "Estabelecimento") if est else "Estabelecimento",
            "category": est.get("category", "") if est else "",
            "linked_at": e.get("created_at").isoformat() if isinstance(e.get("created_at"), datetime) else str(e.get("created_at", "")),
            "expires_at": e.get("expires_at").isoformat() if isinstance(e.get("expires_at"), datetime) else str(e.get("expires_at", "")),
        })

    client_details = []
    for c in active_clients:
        u = await db.users.find_one({"user_id": c.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        client_details.append({
            "user_id": c.get("user_id"),
            "name": u.get("name", "Cliente") if u else "Cliente",
            "email": u.get("email", "") if u else "",
            "linked_at": c.get("created_at").isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", "")),
            "expires_at": c.get("expires_at").isoformat() if isinstance(c.get("expires_at"), datetime) else str(c.get("expires_at", "")),
        })

    return {
        "rep_id": rep_id,
        "name": rep.get("name"),
        "email": rep.get("email"),
        "cnpj": rep.get("cnpj"),
        "status": rep.get("status"),
        "referral_code": rep.get("referral_code"),
        "stats": {
            "total_clients": len(active_clients),
            "total_establishments": len(active_establishments),
            "commission_balance": rep.get("commission_balance", 0),
            "total_earned": rep.get("total_earned", 0),
            "total_withdrawn": rep.get("total_withdrawn", 0),
        },
        "free_tokens": {
            "allocated": free_allocated,
            "used": free_used,
            "remaining": free_remaining,
        },
        "establishments": est_details,
        "clients": client_details,
        "recent_commissions": recent_commissions,
    }


@rep_router.get("/rep/commissions")
async def get_rep_commissions(rep: dict = Depends(get_current_representative), limit: int = 50):
    commissions = await db.rep_commissions.find({"rep_id": rep["rep_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for c in commissions:
        if isinstance(c.get("created_at"), datetime):
            c["created_at"] = c["created_at"].isoformat()
    return commissions


# ===================== EXPIRATION =====================

@rep_router.post("/admin/rep-expire-links")
async def admin_expire_rep_links(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    now = datetime.now(timezone.utc)
    result = await db.rep_referrals.update_many(
        {"expires_at": {"$lte": now}, "expired": {"$ne": True}},
        {"$set": {"expired": True, "expired_at": now}}
    )
    return {"expired_count": result.modified_count, "message": f"{result.modified_count} vinculos expirados"}


@rep_router.get("/rep/expiring-links")
async def get_rep_expiring_links(rep: dict = Depends(get_current_representative)):
    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=30)
    expiring = await db.rep_referrals.find(
        {"rep_id": rep["rep_id"], "expires_at": {"$gt": now, "$lte": soon}, "expired": {"$ne": True}},
        {"_id": 0, "base64_data": 0}
    ).to_list(50)
    for e in expiring:
        for k in ["created_at", "expires_at"]:
            if isinstance(e.get(k), datetime):
                e[k] = e[k].isoformat()
    return expiring


# ===================== CONTRACT =====================

CONTRACT_TEMPLATE = """CONTRATO DE REPRESENTACAO COMERCIAL PJ

CONTRATANTE: iToke Plataforma Digital
CONTRATADO(A): {rep_name}
CNPJ: {rep_cnpj}
EMAIL: {rep_email}

1. OBJETO
O presente contrato tem por objeto a prestacao de servicos de representacao comercial para captacao de estabelecimentos e clientes para a plataforma iToke.

2. COMISSAO
O CONTRATADO recebera comissao por transacao realizada por indicados diretos, conforme valor definido pela plataforma (atualmente R$ {commission_value}).

3. VINCULO
Nao ha vinculo empregaticio entre as partes. O CONTRATADO atua como pessoa juridica autonoma, sem exclusividade ou subordinacao.

4. PRAZO DE VINCULACAO
Os indicados permanecerao vinculados ao CONTRATADO por 12 (doze) meses a partir da data de cadastro, apos o qual migram para a rede principal da plataforma.

5. TOKENS GRATUITOS
Tokens gratuitos fornecidos pela plataforma sao exclusivamente para incentivo comercial e nao geram comissao ao CONTRATADO.

6. SAQUES
Os saques de comissoes acumuladas devem ser solicitados via dashboard e serao processados em ate 5 dias uteis apos aprovacao.

7. RESCISAO
Qualquer das partes pode rescindir este contrato a qualquer momento, mediante comunicacao por escrito.

8. VIGENCIA
Este contrato entra em vigor na data de sua assinatura digital e permanece valido por prazo indeterminado.

Data de aceite: {accept_date}
IP de aceite: {accept_ip}
"""


@rep_router.post("/rep/accept-contract")
async def accept_contract(request: Request, rep: dict = Depends(get_current_representative)):
    body = await request.json()
    full_name = body.get("full_name", "").strip()

    if not full_name:
        raise HTTPException(status_code=400, detail="Nome completo obrigatorio para aceite")

    if rep.get("contract_accepted"):
        return {"already_accepted": True, "message": "Contrato ja aceito anteriormente"}

    now = datetime.now(timezone.utc)
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "unknown")

    settings = await db.platform_settings.find_one({"key": "rep_commission_value"}, {"_id": 0})
    commission_value = settings.get("value", 1.00) if settings else 1.00

    contract_text = CONTRACT_TEMPLATE.format(
        rep_name=rep["name"], rep_cnpj=rep["cnpj"], rep_email=rep["email"],
        commission_value=f"{commission_value:.2f}",
        accept_date=now.strftime("%d/%m/%Y %H:%M UTC"), accept_ip=client_ip,
    )

    contract_record = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "rep_id": rep["rep_id"],
        "full_name_signed": full_name,
        "contract_text": contract_text,
        "ip_address": client_ip,
        "user_agent": user_agent,
        "accepted_at": now,
    }
    await db.rep_contracts.insert_one(contract_record)

    await db.representatives.update_one(
        {"rep_id": rep["rep_id"]},
        {"$set": {"contract_accepted": True, "contract_accepted_at": now, "status": "active", "updated_at": now}}
    )

    return {"accepted": True, "contract_id": contract_record["contract_id"], "message": "Contrato aceito com sucesso!"}


@rep_router.get("/rep/contract")
async def get_rep_contract(rep: dict = Depends(get_current_representative)):
    contract = await db.rep_contracts.find_one({"rep_id": rep["rep_id"]}, {"_id": 0})

    settings = await db.platform_settings.find_one({"key": "rep_commission_value"}, {"_id": 0})
    commission_value = settings.get("value", 1.00) if settings else 1.00

    preview_text = CONTRACT_TEMPLATE.format(
        rep_name=rep["name"], rep_cnpj=rep["cnpj"], rep_email=rep["email"],
        commission_value=f"{commission_value:.2f}",
        accept_date="[Pendente]", accept_ip="[Pendente]",
    )

    if contract:
        if isinstance(contract.get("accepted_at"), datetime):
            contract["accepted_at"] = contract["accepted_at"].isoformat()
        return {"accepted": True, "contract": contract, "preview_text": contract.get("contract_text", preview_text)}

    return {"accepted": False, "contract": None, "preview_text": preview_text}


# ===================== DOCUMENTS =====================

@rep_router.post("/rep/upload-document")
async def upload_rep_document(request: Request, rep: dict = Depends(get_current_representative)):
    body = await request.json()
    doc_type = body.get("doc_type", "")
    base64_data = body.get("base64_data", "")
    filename = body.get("filename", "documento")

    if not doc_type or doc_type not in ["rg", "cnpj_card", "contrato_social", "selfie", "outro"]:
        raise HTTPException(status_code=400, detail="Tipo de documento invalido")
    if not base64_data:
        raise HTTPException(status_code=400, detail="Arquivo obrigatorio")

    doc_count = await db.rep_documents.count_documents({"rep_id": rep["rep_id"]})
    if doc_count >= 10:
        raise HTTPException(status_code=400, detail="Limite de 10 documentos atingido")

    doc_id = f"repdoc_{uuid.uuid4().hex[:12]}"
    document = {
        "doc_id": doc_id, "rep_id": rep["rep_id"], "doc_type": doc_type,
        "filename": filename, "base64_data": base64_data,
        "status": "pending", "uploaded_at": datetime.now(timezone.utc),
    }
    await db.rep_documents.insert_one(document)
    return {"doc_id": doc_id, "status": "pending", "message": "Documento enviado para analise"}


@rep_router.get("/rep/documents")
async def get_rep_documents(rep: dict = Depends(get_current_representative)):
    docs = await db.rep_documents.find({"rep_id": rep["rep_id"]}, {"_id": 0, "base64_data": 0}).sort("uploaded_at", -1).to_list(20)
    for d in docs:
        if isinstance(d.get("uploaded_at"), datetime):
            d["uploaded_at"] = d["uploaded_at"].isoformat()
    return docs


@rep_router.delete("/rep/documents/{doc_id}")
async def delete_rep_document(doc_id: str, rep: dict = Depends(get_current_representative)):
    result = await db.rep_documents.delete_one({"doc_id": doc_id, "rep_id": rep["rep_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")
    return {"deleted": True}


# ===================== WITHDRAWALS =====================

@rep_router.post("/rep/withdrawals")
async def request_rep_withdrawal(request: Request, rep: dict = Depends(get_current_representative)):
    body = await request.json()
    amount = float(body.get("amount", 0))
    pix_key = body.get("pix_key", "").strip()
    pix_type = body.get("pix_type", "cpf")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    balance = rep.get("commission_balance", 0)
    if amount > balance:
        raise HTTPException(status_code=400, detail=f"Saldo insuficiente. Disponivel: R$ {balance:.2f}")
    if not pix_key:
        raise HTTPException(status_code=400, detail="Chave PIX obrigatoria")

    pending = await db.rep_withdrawals.find_one({"rep_id": rep["rep_id"], "status": "pending"})
    if pending:
        raise HTTPException(status_code=400, detail="Voce ja possui um saque pendente. Aguarde a aprovacao.")

    wd_id = f"repwd_{uuid.uuid4().hex[:12]}"
    withdrawal = {
        "withdrawal_id": wd_id, "rep_id": rep["rep_id"], "rep_name": rep["name"],
        "amount": amount, "pix_key": pix_key, "pix_type": pix_type,
        "status": "pending", "created_at": datetime.now(timezone.utc),
    }
    await db.rep_withdrawals.insert_one(withdrawal)
    await db.representatives.update_one({"rep_id": rep["rep_id"]}, {"$inc": {"commission_balance": -amount}})

    return {"withdrawal_id": wd_id, "amount": amount, "status": "pending", "message": "Saque solicitado! Aguarde aprovacao."}


@rep_router.get("/rep/withdrawals")
async def get_rep_withdrawals(rep: dict = Depends(get_current_representative)):
    withdrawals = await db.rep_withdrawals.find({"rep_id": rep["rep_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for w in withdrawals:
        for key in ["created_at", "processed_at"]:
            if isinstance(w.get(key), datetime):
                w[key] = w[key].isoformat()
    return withdrawals


# ===================== ADMIN: DOCUMENTS & WITHDRAWALS =====================

@rep_router.get("/admin/rep-documents/{rep_id}")
async def admin_get_rep_documents(rep_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    docs = await db.rep_documents.find({"rep_id": rep_id}, {"_id": 0}).sort("uploaded_at", -1).to_list(20)
    for d in docs:
        if isinstance(d.get("uploaded_at"), datetime):
            d["uploaded_at"] = d["uploaded_at"].isoformat()
    return docs


@rep_router.put("/admin/rep-documents/{doc_id}/review")
async def admin_review_rep_document(doc_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    status = body.get("status")
    note = body.get("note", "")
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status deve ser 'approved' ou 'rejected'")
    result = await db.rep_documents.update_one(
        {"doc_id": doc_id},
        {"$set": {"status": status, "review_note": note, "reviewed_at": datetime.now(timezone.utc), "reviewed_by": user["user_id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")
    return {"doc_id": doc_id, "status": status}


@rep_router.get("/admin/rep-contracts/{rep_id}")
async def admin_get_rep_contract(rep_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    contract = await db.rep_contracts.find_one({"rep_id": rep_id}, {"_id": 0})
    if not contract:
        return {"signed": False, "contract": None}
    if isinstance(contract.get("accepted_at"), datetime):
        contract["accepted_at"] = contract["accepted_at"].isoformat()
    return {"signed": True, "contract": contract}


@rep_router.get("/admin/rep-withdrawals")
async def admin_list_rep_withdrawals(user: dict = Depends(get_current_user), status_filter: str = "all"):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = {}
    if status_filter != "all":
        query["status"] = status_filter
    withdrawals = await db.rep_withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for w in withdrawals:
        for key in ["created_at", "processed_at"]:
            if isinstance(w.get(key), datetime):
                w[key] = w[key].isoformat()
    return withdrawals


@rep_router.put("/admin/rep-withdrawals/{wd_id}")
async def admin_process_rep_withdrawal(wd_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    action = body.get("action")
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Acao deve ser 'approve' ou 'reject'")

    wd = await db.rep_withdrawals.find_one({"withdrawal_id": wd_id, "status": "pending"}, {"_id": 0})
    if not wd:
        raise HTTPException(status_code=404, detail="Saque nao encontrado ou ja processado")

    now = datetime.now(timezone.utc)

    if action == "approve":
        await db.rep_withdrawals.update_one(
            {"withdrawal_id": wd_id},
            {"$set": {"status": "paid", "processed_at": now, "processed_by": user["user_id"]}}
        )
        await db.representatives.update_one({"rep_id": wd["rep_id"]}, {"$inc": {"total_withdrawn": wd["amount"]}})
        return {"withdrawal_id": wd_id, "status": "paid", "message": "Saque aprovado e marcado como pago"}
    else:
        await db.rep_withdrawals.update_one(
            {"withdrawal_id": wd_id},
            {"$set": {"status": "rejected", "processed_at": now, "processed_by": user["user_id"]}}
        )
        await db.representatives.update_one({"rep_id": wd["rep_id"]}, {"$inc": {"commission_balance": wd["amount"]}})
        return {"withdrawal_id": wd_id, "status": "rejected", "message": "Saque rejeitado. Saldo devolvido."}


# ===================== REP MARKETING MATERIALS (Admin-managed) =====================

@rep_router.get("/admin/rep-marketing-materials")
async def admin_get_marketing_materials(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    materials = await db.rep_marketing_materials.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for m in materials:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return materials


@rep_router.post("/admin/rep-marketing-materials")
async def admin_create_marketing_material(request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    mat_id = f"repmat_{uuid.uuid4().hex[:12]}"
    material = {
        "material_id": mat_id,
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "type": body.get("type", "image"),  # image, video
        "base64_data": body.get("base64_data", ""),
        "url": body.get("url", ""),
        "target": body.get("target", "both"),  # client, establishment, both
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.rep_marketing_materials.insert_one(material)
    material.pop("_id", None)
    return material


@rep_router.delete("/admin/rep-marketing-materials/{material_id}")
async def admin_delete_marketing_material(material_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.rep_marketing_materials.delete_one({"material_id": material_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material nao encontrado")
    return {"deleted": True}


@rep_router.get("/rep/marketing-materials")
async def get_rep_marketing_materials(rep: dict = Depends(get_current_representative)):
    """Rep gets active marketing materials"""
    materials = await db.rep_marketing_materials.find(
        {"active": True},
        {"_id": 0, "base64_data": 0}
    ).sort("created_at", -1).to_list(50)
    for m in materials:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return materials


@rep_router.get("/rep/marketing-materials/{material_id}")
async def get_rep_material_detail(material_id: str, rep: dict = Depends(get_current_representative)):
    """Rep gets a specific material with full data"""
    mat = await db.rep_marketing_materials.find_one(
        {"material_id": material_id, "active": True}, {"_id": 0}
    )
    if not mat:
        raise HTTPException(status_code=404, detail="Material nao encontrado")
    if isinstance(mat.get("created_at"), datetime):
        mat["created_at"] = mat["created_at"].isoformat()
    return mat


@rep_router.get("/rep/share-link")
async def get_rep_share_link(rep: dict = Depends(get_current_representative)):
    """Get the full share link for the representative"""
    code = rep.get("referral_code", "")
    return {
        "referral_code": code,
        "share_link_client": f"https://itoke.com.br?rep={code}",
        "share_link_establishment": f"https://itoke.com.br?rep={code}&type=est",
        "share_message_client": f"Ola! Baixe o iToke e ganhe descontos incriveis em restaurantes, lojas e muito mais! Use meu codigo {code} e comece com vantagens: https://itoke.com.br?rep={code}",
        "share_message_establishment": f"Ola! Conheca o iToke, a plataforma que atrai novos clientes para o seu negocio com sistema de tokens e ofertas. Cadastre-se com meu codigo {code} e ganhe tokens gratis para comecar: https://itoke.com.br?rep={code}&type=est",
    }


# ===================== FREE TOKEN ALLOCATION TO ESTABLISHMENTS =====================

@rep_router.get("/admin/rep-token-rules")
async def admin_get_token_rules(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rules = await db.platform_settings.find_one({"key": "rep_token_rules"}, {"_id": 0})
    defaults = {
        "max_tokens_per_establishment": 50,
        "token_validity_days": 30,
        "allow_second_allocation": False,
        "require_admin_approval_for_repeat": True,
    }
    return rules.get("value", defaults) if rules else defaults


@rep_router.put("/admin/rep-token-rules")
async def admin_update_token_rules(request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    await db.platform_settings.update_one(
        {"key": "rep_token_rules"},
        {"$set": {"key": "rep_token_rules", "value": body}},
        upsert=True
    )
    return body


@rep_router.post("/rep/allocate-tokens")
async def rep_allocate_free_tokens(request: Request, rep: dict = Depends(get_current_representative)):
    """Representative allocates free tokens to an establishment they referred"""
    body = await request.json()
    establishment_id = body.get("establishment_id", "")
    amount = int(body.get("amount", 0))

    if not establishment_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Estabelecimento e quantidade obrigatorios")

    # Check rep has enough free tokens
    free_remaining = rep.get("free_tokens_allocated", 0) - rep.get("free_tokens_used", 0)
    if amount > free_remaining:
        raise HTTPException(status_code=400, detail=f"Tokens gratis insuficientes. Restantes: {free_remaining}")

    # Check establishment is linked to this rep
    link = await db.rep_referrals.find_one(
        {"rep_id": rep["rep_id"], "establishment_id": establishment_id, "type": "establishment"},
        {"_id": 0}
    )
    if not link:
        raise HTTPException(status_code=400, detail="Este estabelecimento nao esta vinculado a voce")

    # Get rules
    rules_doc = await db.platform_settings.find_one({"key": "rep_token_rules"}, {"_id": 0})
    rules = rules_doc.get("value", {}) if rules_doc else {}
    max_per_est = rules.get("max_tokens_per_establishment", 50)
    validity_days = rules.get("token_validity_days", 30)
    allow_second = rules.get("allow_second_allocation", False)

    # Check if already allocated to this establishment
    existing_allocation = await db.rep_token_allocations.find_one(
        {"rep_id": rep["rep_id"], "establishment_id": establishment_id, "status": {"$ne": "rejected"}},
        {"_id": 0}
    )

    if existing_allocation:
        if not allow_second:
            # Check if needs admin approval
            if rules.get("require_admin_approval_for_repeat", True):
                # Create a pending request
                req_id = f"repalloc_{uuid.uuid4().hex[:12]}"
                await db.rep_token_allocations.insert_one({
                    "allocation_id": req_id,
                    "rep_id": rep["rep_id"],
                    "rep_name": rep["name"],
                    "establishment_id": establishment_id,
                    "amount": min(amount, max_per_est),
                    "status": "pending_approval",
                    "is_repeat": True,
                    "created_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=validity_days),
                })
                return {"status": "pending_approval", "message": "Segunda alocacao requer aprovacao do administrador. Solicitacao enviada."}
            raise HTTPException(status_code=400, detail="Ja foi feita uma alocacao para este estabelecimento")

    # Enforce max per establishment
    if amount > max_per_est:
        amount = max_per_est

    now = datetime.now(timezone.utc)
    alloc_id = f"repalloc_{uuid.uuid4().hex[:12]}"

    allocation = {
        "allocation_id": alloc_id,
        "rep_id": rep["rep_id"],
        "rep_name": rep["name"],
        "establishment_id": establishment_id,
        "amount": amount,
        "status": "approved",
        "is_repeat": False,
        "created_at": now,
        "expires_at": now + timedelta(days=validity_days),
    }
    await db.rep_token_allocations.insert_one(allocation)

    # Deduct from rep free tokens
    await db.representatives.update_one(
        {"rep_id": rep["rep_id"]},
        {"$inc": {"free_tokens_used": amount}}
    )

    # Credit tokens to establishment
    await db.establishments.update_one(
        {"establishment_id": establishment_id},
        {"$inc": {"token_balance": amount}}
    )

    return {"allocation_id": alloc_id, "amount": amount, "status": "approved", "message": f"{amount} tokens gratis alocados ao estabelecimento!"}


@rep_router.get("/rep/token-allocations")
async def get_rep_token_allocations(rep: dict = Depends(get_current_representative)):
    """Get history of token allocations"""
    allocations = await db.rep_token_allocations.find(
        {"rep_id": rep["rep_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for a in allocations:
        for k in ["created_at", "expires_at"]:
            if isinstance(a.get(k), datetime):
                a[k] = a[k].isoformat()
        # Enrich with establishment name
        est = await db.establishments.find_one(
            {"establishment_id": a.get("establishment_id")}, {"_id": 0, "business_name": 1}
        )
        a["establishment_name"] = est.get("business_name", "Estabelecimento") if est else "Estabelecimento"
    
    return allocations


@rep_router.get("/admin/rep-token-allocations")
async def admin_list_token_allocations(user: dict = Depends(get_current_user), status_filter: str = "all"):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = {}
    if status_filter != "all":
        query["status"] = status_filter
    allocations = await db.rep_token_allocations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for a in allocations:
        for k in ["created_at", "expires_at"]:
            if isinstance(a.get(k), datetime):
                a[k] = a[k].isoformat()
    return allocations


@rep_router.put("/admin/rep-token-allocations/{alloc_id}")
async def admin_process_token_allocation(alloc_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    action = body.get("action")
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Acao deve ser 'approve' ou 'reject'")

    alloc = await db.rep_token_allocations.find_one(
        {"allocation_id": alloc_id, "status": "pending_approval"}, {"_id": 0}
    )
    if not alloc:
        raise HTTPException(status_code=404, detail="Alocacao nao encontrada ou ja processada")

    now = datetime.now(timezone.utc)
    if action == "approve":
        await db.rep_token_allocations.update_one(
            {"allocation_id": alloc_id},
            {"$set": {"status": "approved", "processed_at": now}}
        )
        await db.representatives.update_one(
            {"rep_id": alloc["rep_id"]},
            {"$inc": {"free_tokens_used": alloc["amount"]}}
        )
        await db.establishments.update_one(
            {"establishment_id": alloc["establishment_id"]},
            {"$inc": {"token_balance": alloc["amount"]}}
        )
        return {"status": "approved", "message": f"{alloc['amount']} tokens alocados"}
    else:
        await db.rep_token_allocations.update_one(
            {"allocation_id": alloc_id},
            {"$set": {"status": "rejected", "processed_at": now}}
        )
        return {"status": "rejected", "message": "Alocacao rejeitada"}


# ===================== SPECIAL LAUNCH PACKAGE FOR CLIENTS =====================

@rep_router.get("/admin/rep-special-package")
async def admin_get_special_package(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    pkg = await db.platform_settings.find_one({"key": "rep_special_package"}, {"_id": 0})
    defaults = {"tokens": 20, "price": 9.90, "name": "Pacote Especial de Lancamento", "active": True}
    return pkg.get("value", defaults) if pkg else defaults


@rep_router.put("/admin/rep-special-package")
async def admin_update_special_package(request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    await db.platform_settings.update_one(
        {"key": "rep_special_package"},
        {"$set": {"key": "rep_special_package", "value": body}},
        upsert=True
    )
    return body


@rep_router.get("/rep/special-package")
async def get_rep_special_package(rep: dict = Depends(get_current_representative)):
    """Get the special launch package info for sharing with clients"""
    pkg = await db.platform_settings.find_one({"key": "rep_special_package"}, {"_id": 0})
    defaults = {"tokens": 20, "price": 9.90, "name": "Pacote Especial de Lancamento", "active": True}
    return pkg.get("value", defaults) if pkg else defaults
