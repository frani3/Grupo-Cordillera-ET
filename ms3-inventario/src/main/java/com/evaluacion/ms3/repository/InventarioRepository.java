package com.evaluacion.ms3.repository;

import com.evaluacion.ms3.model.ItemInventario;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

// Patron Singleton: unica instancia de almacenamiento en memoria (no gestionada por Spring)
public class InventarioRepository {

    private static final class Holder {
        static final InventarioRepository INSTANCE = new InventarioRepository();
    }

    private final List<ItemInventario> items = new CopyOnWriteArrayList<>();
    private final AtomicLong idSeq = new AtomicLong(1);

    private InventarioRepository() {}

    public static InventarioRepository getInstance() {
        return Holder.INSTANCE;
    }

    public ItemInventario save(ItemInventario item) {
        item.setId(idSeq.getAndIncrement());
        items.add(item);
        return item;
    }

    public List<ItemInventario> findAll() {
        return List.copyOf(items);
    }

    public int count() {
        return items.size();
    }
}
