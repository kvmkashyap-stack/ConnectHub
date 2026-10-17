
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
    content: str
    created_at: datetime


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    author_id: int
    content: str
    created_at: datetime
