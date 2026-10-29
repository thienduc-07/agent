import asyncio
import logging

logger = logging.getLogger("grandline.runtime.cancellation")

class TaskCancelledException(Exception):
    """Raised when an active task execution is cancelled by user request."""
    pass

class CancellationToken:
    def __init__(self):
        self._is_cancelled = False
        self._reason = ""

    def cancel(self, reason: str = "User requested cancellation") -> None:
        self._is_cancelled = True
        self._reason = reason
        logger.info(f"Cancellation requested: {reason}")

    @property
    def is_cancelled(self) -> bool:
        return self._is_cancelled

    @property
    def reason(self) -> str:
        return self._reason

    def check(self) -> None:
        if self._is_cancelled:
            raise TaskCancelledException(f"Task cancelled: {self._reason}")
