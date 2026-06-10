# src/core/context_provider_interface.py
from abc import ABC, abstractmethod

class ContextProvider(ABC):
    """
    Interface for a pluggable module that provides context for a given user query.
    These are designed to be executed in parallel by an orchestrator.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """A unique name for the context source, used for formatting the prompt."""
        pass

    @abstractmethod
    async def get_context(self, user_message: str) -> str:
        """
        Asynchronously retrieves context relevant to the user's message.
        Should handle its own errors and return an empty string on failure.
        """
        pass
