from sqlalchemy import Column, Integer, String, DateTime
from src.core.database import Base  # Import Base from your database setup
from datetime import datetime, timezone


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(String, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<Message(id={self.id}, user_id='{self.user_id}', role='{self.role}', content='{self.content[:50]}...')>"
