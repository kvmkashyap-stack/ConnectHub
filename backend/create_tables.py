from database import Base, engine

# Import every model so SQLAlchemy knows all the tables.
from models.user import User
from models.social import Post, Comment, Like, Follow
from models.chat import Conversation, ConversationMember, Message

Base.metadata.create_all(bind=engine)

print("ConnectHub database tables are ready!")
