
'use server';

import ICAL from 'ical.js';

export interface ExternalEvent {
  id: string;
  title: string;
  startDate: string; // ISO String
  endDate: string;   // ISO String
  location?: string;
  description?: string;
  sourceName: string;
}

/**
 * Busca e processa um link iCal (URL pública do Google Calendar).
 */
export async function fetchExternalCalendarEvents(url: string, name: string): Promise<ExternalEvent[]> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache de 1 hora
    if (!response.ok) throw new Error('Falha ao buscar agenda externa');
    
    const icalData = await response.text();
    const jcalData = ICAL.parse(icalData);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');

    return vevents.map((vevent) => {
      const event = new ICAL.Event(vevent);
      return {
        id: event.uid,
        title: event.summary,
        startDate: event.startDate.toJSDate().toISOString(),
        endDate: event.endDate.toJSDate().toISOString(),
        location: event.location,
        description: event.description,
        sourceName: name,
      };
    });
  } catch (error) {
    console.error('Erro ao processar iCal:', error);
    return [];
  }
}
