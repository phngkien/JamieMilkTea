// Các màn HTML của phòng chơi chung: menu, tạo phòng, vào phòng, phòng chờ (chọn trạm).
import { ROOM_TEXT, SETTINGS_TEXT, STATION_JOBS, STATION_NAMES, fill } from '../config/strings';
import { ALL_STATIONS, stationsOf, type StationOwners } from '../core/stations';
import type { Station } from '../core/types';
import type { PlayerInfo, RoomInfo } from '../net/NetAdapter';
import { esc } from './modal';

export function renderRoomMenu(): string {
  return `
    <header class="modal-head"><h2>${esc(ROOM_TEXT.menuTitle)}</h2></header>
    <div class="modal-body settings-list">
      <p class="hint">${esc(ROOM_TEXT.menuHint)}</p>
      <button type="button" class="primary big" data-action="create">${esc(ROOM_TEXT.create)}</button>
      <button type="button" class="big" data-action="join">${esc(ROOM_TEXT.join)}</button>
    </div>
    <footer class="modal-foot"><button type="button" data-action="close">${esc(ROOM_TEXT.close)}</button></footer>`;
}

function nameField(name: string): string {
  return `<label class="field"><span>${esc(ROOM_TEXT.yourName)}</span>
    <input id="room-name" type="text" maxlength="16" autocomplete="nickname" value="${esc(name)}" placeholder="${esc(ROOM_TEXT.namePlaceholder)}"></label>`;
}

export function renderCreate(name: string, error = '', busy = false): string {
  return `
    <header class="modal-head"><h2>${esc(ROOM_TEXT.create)}</h2></header>
    <div class="modal-body settings-list">
      ${nameField(name)}
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
    </div>
    <footer class="modal-foot two">
      <button type="button" data-action="back">${esc(ROOM_TEXT.back)}</button>
      <button type="button" class="primary" data-action="do-create" ${busy ? 'disabled' : ''}>${esc(busy ? ROOM_TEXT.connecting : ROOM_TEXT.createButton)}</button>
    </footer>`;
}

export function renderJoin(name: string, code: string, error = '', busy = false): string {
  return `
    <header class="modal-head"><h2>${esc(ROOM_TEXT.join)}</h2></header>
    <div class="modal-body settings-list">
      <label class="field"><span>${esc(ROOM_TEXT.code)}</span>
        <input id="room-code" type="text" maxlength="8" autocapitalize="characters" autocomplete="off" value="${esc(code)}" placeholder="${esc(ROOM_TEXT.codePlaceholder)}"></label>
      ${nameField(name)}
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
    </div>
    <footer class="modal-foot two">
      <button type="button" data-action="back">${esc(ROOM_TEXT.back)}</button>
      <button type="button" class="primary" data-action="do-join" ${busy ? 'disabled' : ''}>${esc(busy ? ROOM_TEXT.connecting : ROOM_TEXT.joinButton)}</button>
    </footer>`;
}

function playerRow(p: PlayerInfo, info: RoomInfo, me: string, owners: StationOwners): string {
  const tags = [
    p.uid === me ? ROOM_TEXT.you : '',
    p.uid === info.hostUid ? ROOM_TEXT.host : '',
    !p.online ? ROOM_TEXT.offline : '',
  ].filter(Boolean);
  const stations = stationsOf(owners, p.uid).map((s) => STATION_NAMES[s]).join(' + ') || '—';
  return `<li class="player ${p.online ? '' : 'off'}">
    <span class="dot" style="background:${esc(p.color)}"></span>
    <b>${esc(p.name)}</b>${tags.length ? ` <small>(${esc(tags.join(', '))})</small>` : ''}
    <span class="player-station">${esc(stations)}</span></li>`;
}

function stationCard(s: Station, info: RoomInfo, me: string): string {
  const picker = info.players.find((p) => p.station === s && p.online) ?? info.players.find((p) => p.station === s);
  const mine = picker?.uid === me;
  const taken = picker && !mine;
  const status = mine ? ROOM_TEXT.stationMine : taken ? fill(ROOM_TEXT.stationTaken, { name: picker.name }) : ROOM_TEXT.stationFree;
  return `<button type="button" class="station-card ${mine ? 'mine' : ''} ${taken ? 'taken' : ''}" data-action="station" data-station="${s}" ${taken ? 'disabled' : ''}>
    <b>${esc(STATION_NAMES[s])}</b><span>${esc(STATION_JOBS[s])}</span><em>${esc(status)}</em></button>`;
}

export function renderLobby(info: RoomInfo, me: string, owners: StationOwners, link: string): string {
  const owner = info.players.find((p) => p.uid === info.ownerUid)?.name ?? '';
  const isHost = info.hostUid === me;
  const myStations = stationsOf(owners, me);
  const merged = myStations.length > 1 ? fill(ROOM_TEXT.mergedWith, { list: myStations.map((s) => STATION_NAMES[s]).join(' + ') }) : '';
  const footer =
    info.status === 'lobby'
      ? isHost
        ? `<button type="button" class="primary" data-action="open">${esc(ROOM_TEXT.open)}</button>`
        : `<p class="hint center">${esc(ROOM_TEXT.waitHost)}</p>`
      : `<button type="button" class="primary" data-action="close">${esc(ROOM_TEXT.close)}</button>`;
  return `
    <header class="modal-head"><h2>${esc(fill(ROOM_TEXT.lobbyTitle, { owner }))}</h2></header>
    <div class="modal-body">
      <p class="hint">${esc(ROOM_TEXT.shareHint)}</p>
      <div class="room-code">${esc(info.code)}</div>
      <p class="room-link">${esc(link)}</p>
      <button type="button" class="copy" data-action="copy">${esc(ROOM_TEXT.copy)}</button>
      <h3>${esc(fill(ROOM_TEXT.players, { n: info.players.length }))}</h3>
      <ul class="player-list">${info.players.map((p) => playerRow(p, info, me, owners)).join('')}</ul>
      <h3>${esc(ROOM_TEXT.chooseStation)}</h3>
      ${merged ? `<p class="hint">${esc(merged)}</p>` : ''}
      <div class="station-grid">${ALL_STATIONS.map((s) => stationCard(s, info, me)).join('')}</div>
      ${
        isHost
          ? `<button type="button" class="toggle ${info.allowSpending ? 'on' : ''}" data-action="allow-spending">
              <span>${esc(ROOM_TEXT.allowSpending)}</span><b>${esc(info.allowSpending ? SETTINGS_TEXT.on : SETTINGS_TEXT.off)}</b></button>
             <p class="hint">${esc(ROOM_TEXT.allowSpendingHint)}</p>`
          : ''
      }
      ${info.ownerUid === me ? `<p class="hint">${esc(ROOM_TEXT.ownerLeaveHint)}</p>` : ''}
    </div>
    <footer class="modal-foot two">
      <button type="button" class="danger-outline" data-action="leave">${esc(ROOM_TEXT.leave)}</button>
      ${footer}
    </footer>`;
}

/** Khóa để biết phòng chờ có cần vẽ lại không. */
export function lobbyKey(info: RoomInfo, owners: StationOwners): string {
  return JSON.stringify([info.status, info.hostUid, info.players, owners, info.allowSpending]);
}
