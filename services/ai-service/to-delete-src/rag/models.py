from __future__ import annotations as _annotations

import re
import unicodedata
from dataclasses import dataclass

from pydantic import TypeAdapter

from src.utils.text_utils import slugify


@dataclass
class DocsSection:
    id: int
    parent: int | None
    path: str
    level: int
    title: str
    content: str

    def url(self) -> str:
        url_path = re.sub(r'\.md$', '', self.path)
        return f'https://logfire.pydantic.dev/docs/{url_path}/#{slugify(self.title, "-")}'

    def embedding_content(self) -> str:
        return f'''path: {self.path}

title: {self.title}

{self.content}
'''


sections_ta = TypeAdapter(list[DocsSection])
