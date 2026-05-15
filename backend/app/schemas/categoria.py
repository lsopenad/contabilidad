from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

TipoCategoria = Literal["ingreso", "gasto", "ambos"]


class CategoriaBase(BaseModel):
    nombre: str
    tipo: TipoCategoria


class CategoriaCrear(CategoriaBase):
    pass


class CategoriaActualizar(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[TipoCategoria] = None


class CategoriaRespuesta(CategoriaBase):
    id: int
    creado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}
