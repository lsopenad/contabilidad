from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.categoria import Categoria
from ..schemas.categoria import CategoriaActualizar, CategoriaCrear, CategoriaRespuesta

router = APIRouter()


@router.get("/", response_model=list[CategoriaRespuesta])
async def listar_categorias(
    tipo: str | None = Query(None, description="ingreso | gasto | ambos"),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[CategoriaRespuesta]:
    consulta = select(Categoria).order_by(Categoria.nombre)
    if tipo:
        consulta = consulta.where(Categoria.tipo.in_([tipo, "ambos"]))
    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.post("/", response_model=CategoriaRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_categoria(
    datos: CategoriaCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> CategoriaRespuesta:
    categoria = Categoria(**datos.model_dump())
    db.add(categoria)
    await db.commit()
    await db.refresh(categoria)
    return categoria


@router.patch("/{categoria_id}", response_model=CategoriaRespuesta)
async def actualizar_categoria(
    categoria_id: int,
    datos: CategoriaActualizar,
    db: AsyncSession = Depends(obtener_sesion),
) -> CategoriaRespuesta:
    categoria = await db.get(Categoria, categoria_id)
    if not categoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(categoria, campo, valor)
    await db.commit()
    await db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_categoria(
    categoria_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    categoria = await db.get(Categoria, categoria_id)
    if not categoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    await db.delete(categoria)
    await db.commit()
