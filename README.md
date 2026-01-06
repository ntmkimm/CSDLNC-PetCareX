
## PROJECT FOLDERS

```text
PetCareX/
├─ app/                    # BACKEND
│  ├─ main.py
│  ├─ core/
│  │  ├─ config.py          # đọc .env
│  │  ├─ security.py        # JWT + hash password
│  ├─ db/
|  │  ├─ session.py         # SQLAlchemy engine/session
│  │  ├─ migrate.py         # tạo DB + chạy *.sql trong migrations/
│  ├─ api/
│  │  ├─ router.py
│  │  ├─ deps.py            # dependency get_db + auth
│  │  ├─ routes/
│  │  │  ├─ auth.py
│  │  │  ├─ customer.py     # KH1-KH7
│  │  │  ├─ staff.py        # NV1-NV8
│  │  │  ├─ branch.py       # CN1-CN9
│  │  │  ├─ company.py      # CT1-CT8
│  ├─ schemas/              # Pydantic request/response
│  ├─ services/             # business logic gọi SQL / stored procedure
├─ migrations/
│  ├─ 000_base.sql          # file schema bạn đang có
│  ├─ 001_logic.sql         # function/procedure/trigger (nếu có)
│  ├─ 002_seed.sql          # (tuỳ) seed dữ liệu mẫu
├─ requirements.txt
├─ petcarex-admin/           # FRONTEND
└─ README.md

```

# HOW TO RUN

## BACKEND

```
cd PetCareX/
docker compose up -d
conda create -n csdlnc python=3.10 -y
conda activate csdlnc
pip install -r requirements.txt
uvicorn app.main:app --reload
```


If you want to clear database
```
python -m scripts.drop_db
```

Note (please ignore): npx create-next-app@latest petcarex-admin  --ts --app --eslint --src-dir --import-alias "@/*"

## FRONTEND
```
cd petcarex-admin
npm i antd @ant-design/icons axios recharts dayjs
npm run dev
```
