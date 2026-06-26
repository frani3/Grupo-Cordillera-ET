package com.evaluacion.ms5.repository;

import com.evaluacion.ms5.model.EventoReporte;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class ReporteRepository {

    private static final class Holder {
        static final ReporteRepository INSTANCE = new ReporteRepository();
    }

    private final List<EventoReporte> eventos = new CopyOnWriteArrayList<>();
    private final AtomicLong idSeq = new AtomicLong(1);

    private ReporteRepository() {}

    public static ReporteRepository getInstance() {
        return Holder.INSTANCE;
    }

    public EventoReporte save(EventoReporte e) {
        e.setId(idSeq.getAndIncrement());
        eventos.add(e);
        return e;
    }

    public List<EventoReporte> findAll() {
        return List.copyOf(eventos);
    }

    public int count() {
        return eventos.size();
    }
}
