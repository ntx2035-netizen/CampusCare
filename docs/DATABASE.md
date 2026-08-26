# Mô hình dữ liệu

```mermaid
erDiagram
  USERS ||--o{ REFRESH_TOKENS : owns
  USERS ||--o{ INCIDENTS : reports
  USERS ||--o{ INCIDENTS : assigned
  LOCATIONS ||--o{ LOCATIONS : parent
  LOCATIONS ||--o{ INCIDENTS : occurs_at
  INCIDENT_CATEGORIES ||--o{ INCIDENTS : classifies
  INCIDENTS ||--o{ INCIDENT_HISTORIES : has
  USERS ||--o{ INCIDENT_HISTORIES : acts
  INCIDENTS ||--o{ INCIDENT_IMAGES : has
  USERS ||--o{ INCIDENT_IMAGES : uploads
  USERS ||--o{ NOTIFICATIONS : receives
  USERS ||--o{ AUDIT_LOGS : performs

  USERS {
    uuid id PK
    string email UK
    string password_hash
    enum role
    bool is_active
  }
  LOCATIONS {
    uuid id PK
    uuid parent_id FK
    string code UK
    enum kind
    string qr_token UK
    float latitude
    float longitude
  }
  INCIDENTS {
    uuid id PK
    string code UK
    uuid reporter_id FK
    uuid assigned_staff_id FK
    uuid category_id FK
    uuid location_id FK
    enum priority
    enum status
    string idempotency_key
    timestamp due_at
  }
  INCIDENT_HISTORIES {
    uuid id PK
    uuid incident_id FK
    uuid actor_id FK
    enum from_status
    enum to_status
    text note
  }
  INCIDENT_IMAGES {
    uuid id PK
    uuid incident_id FK
    string object_name UK
    enum kind
    string content_type
  }
```

## Bảng

- `users`: một role trên mỗi tài khoản, email unique, soft lock bằng `is_active`.
- `refresh_tokens`: chỉ giữ digest, thời hạn, thời điểm revoke và token thay thế.
- `locations`: adjacency list; code và QR token unique; khóa mềm.
- `incident_categories`: SLA phút và trạng thái hoạt động.
- `incidents`: snapshot nghiệp vụ hiện tại; unique `(reporter_id,
  idempotency_key)`; các timestamp phục vụ SLA/báo cáo.
- `incident_histories`: append-only timeline trạng thái và actor.
- `incident_images`: metadata/quyền trong PostgreSQL, binary trong MinIO.
- `notifications`: inbox bền vững, cờ đã đọc và JSON data.
- `audit_logs`: hành động nhạy cảm, entity, actor, IP và details an toàn.

## Migration và seed

Migration đầu tiên: `services/api/alembic/versions/0001_initial.py`. Container API
luôn chạy `alembic upgrade head` trước khi start. Seed idempotent nằm ở
`app/seed.py`; chạy lại không nhân đôi user/category/location/incident demo.

Backup tối thiểu:

```bash
docker compose exec postgres pg_dump -U campuscare -Fc campuscare > campuscare.dump
docker compose exec minio mc mirror /data /tmp/minio-backup
```

Khi production nên snapshot đồng thời PostgreSQL và MinIO để metadata/object nhất quán.

