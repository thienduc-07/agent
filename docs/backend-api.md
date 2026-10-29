# AI Agent City — Backend, Database & AI Agent Runtime Specification (Milestone 3 & 4)

Tài liệu kỹ thuật hệ thống Backend, Cơ sở dữ liệu và AI Agent Runtime cho dự án **AI Agent City (Grand Line Command Center)**.

---

## 1. Kiến Trúc Tổng Thể

Hệ thống được tổ chức theo kiến trúc phân tầng (Layered Architecture):

```
+--------------------------------------------------------------+
|               3D Frontend (Next.js 16 + R3F)                 |
+--------------------------------------------------------------+
                               |
                   [Centralized API Client]
                     frontend/lib/api/*
                               | (HTTP / JSON / REST)
                               v
+--------------------------------------------------------------+
|                     FastAPI Application                      |
|                     /api/v1 Endpoints                        |
+--------------------------------------------------------------+
                               |
                    [Task Queue / Dispatcher]
                               v
+--------------------------------------------------------------+
|                      AI Agent Runtime                        |
|  +--------------------+     +-----------------------------+  |
|  |     Planner        |     |      Policy Engine          |  |
|  +--------------------+     +-----------------------------+  |
|  |  Execution Loop    |     |      Result Verifier        |  |
|  +--------------------+     +-----------------------------+  |
|  |  LLM Abstraction   |     |      Tool Registry          |  |
|  | (Deterministic/    |     | - workspace_list            |  |
|  |  OpenAI / Ollama)  |     | - file_read / file_search   |  |
|  |                    |     | - workspace_write           |  |
|  |                    |     | - verification_tool         |  |
|  +--------------------+     +-----------------------------+  |
+--------------------------------------------------------------+
                               |
                    [SQLAlchemy 2.x Session]
                               v
+--------------------------------------------------------------+
|                   SQLite Database Engine                     |
|                   (PRAGMA foreign_keys=ON)                   |
|                   Managed via Alembic                        |
+--------------------------------------------------------------+
```

### Nguyên tắc thiết kế:
- **Không truy cập trực tiếp:** Frontend không bao giờ gọi trực tiếp SQLite hoặc can thiệp vào logic database.
- **Tách biệt trách nhiệm:**
  - `routers/endpoints`: Validate schema request, điều phối service, định dạng response.
  - `services`: Thực thi nghiệp vụ, kiểm tra trạng thái chuyển dịch (state transition), ghi nhận audit events trong cùng database transaction.
  - `models`: Khai báo bảng, quan hệ (relationships), indexes và foreign keys.
  - `core/errors`: Chuẩn hóa lỗi theo định dạng duy nhất.

---

## 2. Thiết Kế Cơ Sở Dữ Liệu & Ràng Buộc

Database sử dụng SQLite (`grandline.db`), được quản lý hoàn toàn bằng **Alembic Migrations** với cơ chế bật `PRAGMA foreign_keys = ON;`.

### 2.1. Bảng `agents`
Lưu trữ thông tin các AI agent túc trực trên đảo:
- `id` (VARCHAR 64, PK): Định danh duy nhất và ổn định của agent (VD: `agent-captain-roger`).
- `name` (VARCHAR 120, NOT NULL): Tên hiển thị.
- `role` (VARCHAR 120, NOT NULL): Vai trò nghiệp vụ.
- `description` (TEXT): Mô tả lore và phạm vi phụ trách.
- `station` (VARCHAR 64, NOT NULL): Trạm gác (`captain_hq`, `harbor`, `library`, `workshop`).
- `pos_x`, `pos_y`, `pos_z` (FLOAT): Tọa độ không gian 3D.
- `color`, `avatar` (VARCHAR 32): Mã màu chủ đạo và nhận diện avatar.
- `status` (VARCHAR 32, NOT NULL): Trạng thái hợp lệ: `idle`, `working`, `waiting_approval`, `error`, `offline`.
- `current_task_id` (VARCHAR 64, Nullable): Nhiệm vụ đang đảm nhiệm.
- `created_at`, `updated_at`, `last_seen_at` (DATETIME, UTC).
- **Indexes:** `ix_agents_status`, `ix_agents_created_at`, `ix_agents_status_created`.

### 2.2. Bảng `tasks`
Lưu trữ các nhiệm vụ được giao:
- `id` (VARCHAR 64, PK): UUID ổn định.
- `title` (VARCHAR 120, NOT NULL): Tiêu đề ngắn gọn.
- `description` (TEXT, NOT NULL): Chi tiết chỉ thị.
- `status` (VARCHAR 32, NOT NULL): Trạng thái hợp lệ: `queued`, `planning`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled`.
- `priority` (VARCHAR 20, NOT NULL): Mức ưu tiên: `low`, `normal`, `high`, `urgent`.
- `assigned_agent_id` (VARCHAR 64, FK -> `agents.id`, ON DELETE RESTRICT): Agent được giao việc.
- `started_at`, `completed_at` (DATETIME, Nullable).
- `error_message`, `result_summary` (TEXT, Nullable).
- `created_at`, `updated_at` (DATETIME, UTC).
- **Indexes:** `ix_tasks_status`, `ix_tasks_priority`, `ix_tasks_assigned_agent_id`, `ix_tasks_agent_status`, `ix_tasks_created_at`.

### 2.3. Bảng `task_steps`
Lưu các bước thực thi chi tiết của task:
- `id` (VARCHAR 64, PK): UUID.
- `task_id` (VARCHAR 64, FK -> `tasks.id`, ON DELETE CASCADE).
- `step_index` (INTEGER, NOT NULL): Thứ tự bước (1, 2, 3...).
- `title` (VARCHAR 150, NOT NULL).
- `description` (TEXT, Nullable).
- `status` (VARCHAR 32, NOT NULL): `pending`, `running`, `completed`, `failed`, `skipped`.
- `started_at`, `completed_at`, `error_message`.
- **Ràng buộc duy nhất:** `UniqueConstraint("task_id", "step_index", name="uq_task_step_index")`.

### 2.4. Bảng `agent_events`
Lưu trữ nhật ký sự kiện kiểm toán (Audit Log):
- `id` (VARCHAR 64, PK): UUID.
- `event_type` (VARCHAR 64, NOT NULL): `agent.created`, `task.created`, `task.status_changed`, `task.cancelled`, `approval.required`, v.v.
- `agent_id` (VARCHAR 64, FK -> `agents.id`, ON DELETE SET NULL).
- `task_id` (VARCHAR 64, FK -> `tasks.id`, ON DELETE SET NULL).
- `payload_json` (JSON, Nullable): Dữ liệu ngữ cảnh (cam kết không lưu credential / api key).
- `created_at` (DATETIME, UTC, Indexed).

### 2.5. Bảng `approvals`
Quản lý cơ chế phê duyệt các hành động có rủi ro cao:
- `id` (VARCHAR 64, PK): UUID.
- `task_id` (VARCHAR 64, FK -> `tasks.id`, ON DELETE CASCADE).
- `action_type` (VARCHAR 64, NOT NULL): Loại hành động (VD: `execute_sandbox_script`).
- `description` (TEXT, NOT NULL).
- `status` (VARCHAR 32, NOT NULL): `pending`, `approved`, `rejected`, `expired`.
- `requested_at` (DATETIME, NOT NULL).
- `resolved_at` (DATETIME, Nullable).
- `decision_reason` (TEXT, Nullable).

### 2.6. Bảng `artifacts`
Metadata về sản phẩm đầu ra do agent tạo ra:
- `id` (VARCHAR 64, PK): UUID.
- `task_id` (VARCHAR 64, FK -> `tasks.id`, ON DELETE CASCADE).
- `name` (VARCHAR 120, NOT NULL).
- `artifact_type` (VARCHAR 64, NOT NULL).
- `storage_path` (VARCHAR 255, NOT NULL).
- `mime_type` (VARCHAR 64, NOT NULL).
- `size_bytes` (INTEGER, NOT NULL).
- `created_at` (DATETIME, UTC).

---

## 3. Danh Sách API Endpoints

Tất cả các endpoint nghiệp vụ đều có prefix `/api/v1`.

### 3.1. Health Endpoints
- `GET /health`: Kiểm tra API service.
  ```json
  { "status": "ok", "service": "ai-agent-city-api" }
  ```
- `GET /api/v1/health`: Kiểm tra API và kết nối Database.
  ```json
  {
    "status": "ok",
    "service": "ai-agent-city-api",
    "database": "connected"
  }
  ```

### 3.2. Agents Endpoints
- `GET /api/v1/agents`: Lấy danh sách toàn bộ agent trên đảo.
- `GET /api/v1/agents/{agent_id}`: Lấy chi tiết thông tin agent.
- `POST /api/v1/agents`: Tạo mới agent (Kiểm tra trùng ID, tên không được để trống).
- `PATCH /api/v1/agents/{agent_id}`: Cập nhật thông tin cho phép (`role`, `description`, `station`, `color`, `avatar`).
- `GET /api/v1/agents/{agent_id}/tasks`: Lấy lịch sử task giao cho agent này.

### 3.3. Tasks Endpoints
- `POST /api/v1/tasks`: Tạo nhiệm vụ mới (HTTP 201).
  - Body:
    ```json
    {
      "title": "Kiểm tra phòng thủ cầu cảng",
      "description": "Quét cảm biến xung quanh cầu cảng và kiểm kho",
      "assigned_agent_id": "agent-zoro-quartermaster",
      "priority": "high"
    }
    ```
  - Trạng thái trả về: Luôn bắt đầu ở `queued` (không tự ý đánh dấu hoàn thành).
  - Đồng thời ghi nhận sự kiện `task.created` vào bảng `agent_events` trong cùng một transaction.
- `GET /api/v1/tasks`: Truy vấn danh sách tasks (hỗ trợ query param `status`, `agent_id`, `limit`, `offset`).
- `GET /api/v1/tasks/{task_id}`: Chi tiết task.
- `GET /api/v1/tasks/{task_id}/steps`: Lấy các bước thực thi.
- `POST /api/v1/tasks/{task_id}/cancel`: Hủy task đang trong trạng thái `queued`. Trả về lỗi 409 Conflict nếu task đã hoàn thành hoặc đã bị hủy trước đó.
- `GET /api/v1/tasks/{task_id}/events`: Lấy chuỗi sự kiện kiểm toán liên quan task theo thứ tự thời gian.

### 3.4. Events & Approvals Endpoints
- `GET /api/v1/events`: Truy vấn lịch sử sự kiện với bộ lọc `agent_id`, `task_id`, `event_type`.
- `GET /api/v1/approvals`: Lấy danh sách phê duyệt đang chờ hoặc đã xử lý.
- `POST /api/v1/approvals/{approval_id}/decision`: Đưa ra quyết định phê duyệt (`approved` hoặc `rejected`) kèm lý do `reason`. Ngăn chặn xử lý lại lần hai (trả về 409 Conflict).
- `GET /api/v1/artifacts`: Lấy metadata các artifact đã tạo.

---

## 4. Chuẩn Hóa Lỗi API (Error Contract)

Tất cả các lỗi trả về từ hệ thống đều tuân thủ cấu trúc thống nhất:

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent 'non-existent-agent' does not exist"
  }
}
```

Các mã HTTP Status Code:
- `200 OK`: Truy vấn hoặc cập nhật thành công.
- `201 Created`: Tạo tài nguyên thành công.
- `400 Bad Request`: Yêu cầu không hợp lệ.
- `404 Not Found`: Không tìm thấy tài nguyên (`AGENT_NOT_FOUND`, `TASK_NOT_FOUND`, `APPROVAL_NOT_FOUND`).
- `409 Conflict`: Xung đột trạng thái (`TASK_ALREADY_CANCELLED`, `APPROVAL_ALREADY_RESOLVED`, `AGENT_ALREADY_EXISTS`).
- `422 Unprocessable Entity`: Lỗi validation Pydantic hoặc dữ liệu trống (`EMPTY_TASK_TITLE`, `EMPTY_AGENT_NAME`).
- `500 Internal Server Error`: Lỗi máy chủ không lường trước.

---

## 5. Hướng Dẫn Vận Hành & Khởi Động

### 5.1. Yêu cầu môi trường
- Python 3.9+ (khuyến nghị Python 3.11).
- Node.js 18+.

### 5.2. Cài đặt Backend
```bash
# Tạo và kích hoạt môi trường ảo
python3 -m venv backend/venv
source backend/venv/bin/activate

# Cài đặt thư viện
pip install -r backend/requirements.txt
```

### 5.3. Chạy Migration & Seed Database
```bash
# Chạy migration nâng cấp schema lên mới nhất
PYTHONPATH=. backend/venv/bin/alembic upgrade head

# Chạy seed dữ liệu mẫu (Idempotent: an toàn khi chạy nhiều lần)
PYTHONPATH=. backend/venv/bin/python backend/app/scripts/seed.py
```

### 5.4. Khởi động Backend Server
```bash
# Khởi chạy FastAPI trên port 8000
backend/venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger OpenAPI Docs: `http://localhost:8000/docs`
- ReDoc Docs: `http://localhost:8000/redoc`

### 5.5. Khởi động Frontend 3D
Mở một cửa sổ terminal riêng biệt:
```bash
cd frontend
npm install
npm run dev -- -p 3000
```
Truy cập giao diện 3D tại: `http://localhost:3000`.

### 5.6. Chạy Bộ Kiểm Thử (Pytest)
```bash
# Chạy toàn bộ 62 automated tests với môi trường test SQLite biệt lập
PYTHONPATH=. backend/venv/bin/pytest -v backend/app/tests/
```

---

## 6. Đặc Tả AI Agent Runtime (Milestone 4)

### 6.1. LLM Provider Abstraction
Hệ thống cung cấp interface trừu tượng `LLMProvider` (`backend/app/agent_runtime/llm/`):
- `DeterministicProvider`: Rule-based reasoning engine hỗ trợ chạy hoàn toàn offline và test CI với chi phí 0 token.
- `OpenAIProvider`: Tương thích với OpenAI API, Groq, OpenRouter hoặc vLLM/LM Studio.
- `OllamaProvider`: Kết nối trực tiếp với Ollama cục bộ (`http://localhost:11434`).
- `get_llm_provider()`: Factory trả về provider hoặc bắn lỗi cấu hình `LLMConfigError` rõ ràng (không giả lập kết quả nếu thiếu API key).

### 6.2. Tool Registry & Filesystem Security
Tất cả công cụ được đăng ký tập trung trong `ToolRegistry` (`backend/app/agent_runtime/tools/`):
- `workspace_list`: Liệt kê tệp/thư mục trong workspace có giới hạn độ sâu (max depth 4), tự động bỏ qua `.git`, `node_modules`, `.venv`, `__pycache__`.
- `file_read`: Đọc tệp có giới hạn dung lượng (max 100KB) và offset dòng. Áp dụng `safe_resolve_path` chặn đứng `../` path traversal, symlink escape và tệp bí mật (`.env`, `*.key`, `*.pem`, `id_rsa`).
- `file_search`: Tìm kiếm tệp theo pattern glob (`*.py`) hoặc chuỗi nội dung văn bản.
- `workspace_write`: Ghi/tạo tệp bị giới hạn nghiêm ngặt bên trong thư mục `workspace_sandbox/`.
- `verification_tool`: Kiểm tra tệp tồn tại, kích thước > 0, đọc lại nội dung và kiểm chứng chuỗi ký tự bắt buộc.

### 6.3. Policy Engine & Quyền Hạn
- **Level 0 (Read-only):** Đọc, liệt kê, tìm kiếm, kiểm tra kết quả.
- **Level 1 (Workspace Write):** Ghi tệp vào sandbox; ghi đè tệp yêu cầu approval nếu chính sách yêu cầu.
- **Level 2 (Command Execution):** Lệnh shell/subprocess yêu cầu phê duyệt Captain Approval (chưa kích hoạt tự do trong MVP).
- **Chống Prompt Injection:** Dữ liệu đọc từ file hoặc tool output luôn được đánh dấu là untrusted context, không bao giờ ghi đè system prompt.

### 6.4. Planner & Execution Loop
- `Planner`: Phân rã yêu cầu của người dùng thành cấu trúc `AgentPlan` (tối đa 8 bước). Mỗi bước lưu vào bảng `task_steps` trong database để frontend hiển thị tiến trình.
- `ExecutionLoop`: Vòng lặp thực thi có chặn trên (`max_iterations`, `max_tool_calls`, timeout). Kiểm tra `CancellationToken` trước mỗi tool call.
- `ResultVerifier`: Nhiệm vụ chỉ được đánh dấu `completed` khi có bằng chứng vật lý rằng tệp kết quả thực sự tồn tại trên ổ đĩa và không rỗng.

### 6.5. Task Dispatcher & Crash Recovery
- `TaskDispatcher`: Worker chạy ngầm (background worker) định kỳ quét các task `queued`, claim bằng database transaction, chuyển sang `planning` -> `running`, điều phối Agent `working`.
- `Crash Recovery`: Khi khởi động, hệ thống tự động quét và thu hồi các task bị gián đoạn giữa chừng do tắt server đột ngột, đánh dấu `failed` và giải phóng Agent về `idle`.

---

## 7. Giới Hạn Của MVP & Lộ Trình Milestone 5

### Giới hạn hiện tại:
1. **Authentication:** API chưa có JWT/OAuth2 người dùng (phục vụ local development).
2. **Multi-Agent Negotiation:** Hiện đang sử dụng General Fleet Agent điều phối; cơ chế thương lượng đa agent P2P sẽ mở rộng ở Milestone 5.
3. **Command Execution Sandbox:** Quyền thực thi lệnh shell bị khóa theo mặc định để đảm bảo an toàn tuyệt đối.

### Sẵn sàng cho Milestone 5 (Realtime Multi-Agent Interactions & Deployment):
- Hệ thống runtime, tool registry, policy engine và database persistence đã hoàn thành 100% với 62 automated tests passing.
- Frontend 3D và HUD đã kết nối mượt mà với API và SQLite.
