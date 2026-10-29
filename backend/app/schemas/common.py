from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail

class PaginationMeta(BaseModel):
    total: int
    limit: int
    offset: int
    has_more: bool

class PaginatedResponse(BaseModel):
    items: List[Any]
    meta: PaginationMeta
