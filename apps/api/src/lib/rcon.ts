import net from 'node:net';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Минимальный RCON-клиент (Source RCON protocol), совместимый с vanilla/Paper/Spigot.
 *
 * Пакет: [length:int32LE][id:int32LE][type:int32LE][body:cstring][0x00][0x00]
 * Типы: 3 = SERVERDATA_AUTH, 2 = SERVERDATA_EXECCOMMAND, 0 = RESPONSE_VALUE,
 *       2 = AUTH_RESPONSE (тот же код, что exec).
 *
 * Используется для синхронизации рас/рангов с игровым сервером.
 * Все вызовы "best effort": недоступность RCON не должна ломать HTTP-запрос,
 * поэтому ошибки логируются и возвращаются как { ok: false }.
 */

const TYPE_AUTH = 3;
const TYPE_AUTH_RESPONSE = 2;
const TYPE_EXEC = 2;
const TYPE_RESPONSE = 0;

interface RconResult {
  ok: boolean;
  response: string;
  error?: string;
}

function encodePacket(id: number, type: number, body: string): Buffer {
  const bodyBuf = Buffer.from(body, 'utf8');
  const size = 4 + 4 + bodyBuf.length + 2; // id + type + body + 2 null
  const buf = Buffer.alloc(4 + size);
  buf.writeInt32LE(size, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  bodyBuf.copy(buf, 12);
  buf.writeInt16LE(0, 12 + bodyBuf.length);
  return buf;
}

function decodePackets(buffer: Buffer): Array<{ id: number; type: number; body: string }> {
  const packets: Array<{ id: number; type: number; body: string }> = [];
  let offset = 0;

  while (offset + 12 <= buffer.length) {
    const size = buffer.readInt32LE(offset);
    if (size < 10 || offset + 4 + size > buffer.length) break;

    const id = buffer.readInt32LE(offset + 4);
    const type = buffer.readInt32LE(offset + 8);
    const body = buffer.toString('utf8', offset + 12, offset + 4 + size - 2);
    packets.push({ id, type, body });
    offset += 4 + size;
  }

  return packets;
}

let packetIdCounter = 1;

export async function rconExec(command: string): Promise<RconResult> {
  if (!env.RCON_ENABLED) {
    return { ok: false, response: '', error: 'RCON отключён (RCON_ENABLED=false)' };
  }
  if (!env.RCON_PASSWORD) {
    return { ok: false, response: '', error: 'RCON_PASSWORD не задан' };
  }

  return new Promise<RconResult>((resolve) => {
    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);
    let authed = false;
    let settled = false;
    const authId = packetIdCounter++;
    const execId = packetIdCounter++;

    const finish = (result: RconResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, response: '', error: 'Таймаут RCON' });
    }, env.RCON_TIMEOUT_MS);

    socket.on('error', (err) => {
      logger.warn({ err: err.message }, 'rcon.socket_error');
      finish({ ok: false, response: '', error: err.message });
    });

    socket.on('close', () => {
      if (!settled) finish({ ok: false, response: '', error: 'Соединение RCON закрыто' });
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const packets = decodePackets(buffer);
      if (packets.length === 0) return;
      buffer = Buffer.alloc(0);

      for (const packet of packets) {
        if (!authed && packet.type === TYPE_AUTH_RESPONSE) {
          // id === -1 означает неверный пароль
          if (packet.id === -1 || packet.id !== authId) {
            finish({ ok: false, response: '', error: 'Неверный RCON-пароль' });
            return;
          }
          authed = true;
          socket.write(encodePacket(execId, TYPE_EXEC, command));
          continue;
        }

        if (authed && (packet.type === TYPE_RESPONSE || packet.type === TYPE_EXEC)) {
          finish({ ok: true, response: packet.body });
          return;
        }
      }
    });

    socket.connect(env.RCON_PORT, env.RCON_HOST, () => {
      socket.write(encodePacket(authId, TYPE_AUTH, env.RCON_PASSWORD));
    });
  });
}

const applyTemplate = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');

/** Выдать игроку расу на игровом сервере (через LuckPerms или другой плагин). */
export function syncRaceToServer(mcName: string, raceSlug: string): Promise<RconResult> {
  return rconExec(applyTemplate(env.RCON_RACE_COMMAND, { player: mcName, race: raceSlug }));
}

/** Снять предыдущую расу перед выдачей новой. */
export function unsyncRaceFromServer(mcName: string, raceSlug: string): Promise<RconResult> {
  return rconExec(applyTemplate(env.RCON_UNRACE_COMMAND, { player: mcName, race: raceSlug }));
}

export function syncRankToServer(mcName: string, rank: string): Promise<RconResult> {
  return rconExec(applyTemplate(env.RCON_RANK_COMMAND, { player: mcName, rank }));
}

/** Проверка доступности RCON для health-чека админки. */
export async function pingRcon(): Promise<RconResult> {
  return rconExec('list');
}
