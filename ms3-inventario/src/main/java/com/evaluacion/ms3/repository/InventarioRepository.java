package com.evaluacion.ms3.repository;

import com.evaluacion.ms3.model.ItemInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InventarioRepository extends JpaRepository<ItemInventario, Long> {

    List<ItemInventario> findBySucursal(String sucursal);
    List<ItemInventario> findByCategoria(String categoria);
    List<ItemInventario> findBySucursalAndCategoria(String sucursal, String categoria);
}
