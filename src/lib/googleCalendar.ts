import { google } from "googleapis";

// Turno da manhã: 8h–12h (slots: 8,9,10,11) — cada instalação = 1h
// Turno da tarde: 13h30–19h (slots: 13,14,15,16,17,18) — 13 representa 13h30
const MORNING_SLOTS = [8, 9, 10, 11];
const AFTERNOON_SLOTS = [13, 14, 15, 16, 17, 18];
const TIMEZONE = "America/Sao_Paulo";

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY não configurada");

  const key = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function getCalendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id) throw new Error("GOOGLE_CALENDAR_ID não configurada");
  return id;
}

// Retorna as horas já ocupadas para uma data
async function getBusyHours(date: string): Promise<number[]> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = getCalendarId();

  // date no formato "YYYY-MM-DD"
  const timeMin = new Date(`${date}T00:00:00`);
  const timeMax = new Date(`${date}T23:59:59`);

  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const busyHours: number[] = [];
  for (const event of res.data.items ?? []) {
    if (event.start?.dateTime) {
      const h = new Date(event.start.dateTime).getHours();
      busyHours.push(h);
    }
  }
  return busyHours;
}

export interface AvailabilityResult {
  date: string;
  morning: number[];   // horas disponíveis no turno da manhã
  afternoon: number[]; // horas disponíveis no turno da tarde
  morningFull: boolean;
  afternoonFull: boolean;
}

export async function checkAvailability(date: string): Promise<AvailabilityResult> {
  const busy = await getBusyHours(date);
  const morning = MORNING_SLOTS.filter((h) => !busy.includes(h));
  const afternoon = AFTERNOON_SLOTS.filter((h) => !busy.includes(h));
  return {
    date,
    morning,
    afternoon,
    morningFull: morning.length === 0,
    afternoonFull: afternoon.length === 0,
  };
}

export interface BookingInput {
  date: string;       // "YYYY-MM-DD"
  hour: number;       // hora de início (ex: 9)
  clientName: string;
  clientPhone: string;
  clientAddress: string;
}

export interface BookingResult {
  eventId: string;
  startTime: string;
  endTime: string;
}

export async function bookInstallation(input: BookingInput): Promise<BookingResult> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = getCalendarId();

  const start = new Date(`${input.date}T${String(input.hour).padStart(2, "0")}:00:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hora

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Instalação - ${input.clientName}`,
      description: `Telefone: ${input.clientPhone}\nEndereço: ${input.clientAddress}`,
      start: {
        dateTime: start.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: TIMEZONE,
      },
    },
  });

  return {
    eventId: res.data.id ?? "",
    startTime: res.data.start?.dateTime ?? "",
    endTime: res.data.end?.dateTime ?? "",
  };
}

// Formata disponibilidade em texto legível para o agente
export function formatAvailability(av: AvailabilityResult): string {
  const dateLabel = formatDateBR(av.date);
  const lines: string[] = [`Disponibilidade para ${dateLabel}:`];

  if (!av.morningFull) {
    const firstMorning = av.morning[0];
    lines.push(`• Turno da manhã: a partir das ${firstMorning}h (${av.morning.length} horário${av.morning.length > 1 ? "s" : ""} disponível${av.morning.length > 1 ? "is" : ""})`);
  } else {
    lines.push("• Turno da manhã: lotado");
  }

  if (!av.afternoonFull) {
    const firstAfternoon = av.afternoon[0];
    const firstLabel = firstAfternoon === 13 ? "13h30" : `${firstAfternoon}h`;
    lines.push(`• Turno da tarde: a partir das ${firstLabel} (${av.afternoon.length} horário${av.afternoon.length > 1 ? "s" : ""} disponível${av.afternoon.length > 1 ? "is" : ""})`);
  } else {
    lines.push("• Turno da tarde: lotado");
  }

  if (av.morningFull && av.afternoonFull) {
    return `Infelizmente o dia ${dateLabel} está completamente lotado. Vou verificar outro dia.`;
  }

  return lines.join("\n");
}

// Formata "2025-03-22" → "22/03/2025"
function formatDateBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
