
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class ConversationCreate(BaseModel):
    recipient_id: int = Field(gt=0)


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime
