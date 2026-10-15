from sqlalchemy.orm import Session
from typing import Optional
from app.models.models import Notification

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "system",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        is_read=False,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
