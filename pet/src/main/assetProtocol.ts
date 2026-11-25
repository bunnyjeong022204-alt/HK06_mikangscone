import { protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ASSET_PROTOCOL,
  getBundledSpeciesRoot,
  getLocalSpeciesRoot,
  type SpeciesSource,
} from './speciesLoader';

/**
 * Must be called before app.whenReady(). Registers pet-asset:// as a
 * privileged scheme so it behaves like a normal web-safe origin (loadable
 * from the http://localhost Vite dev server page, supports relative
 * fetches), sidestepping Chromium's hard block on file:// image loads from
 * non-file:// pages.
 */
export function registerAssetProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PROTOCOL,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

/**
 * Must be called after app.whenReady(). Serves species sprite files from
 * either root, chosen by the URL's host segment
 * (pet-asset://<bundled|local>/<id>/<relative path>) — mirrors
 * speciesLoader's own bundled-vs-local resolution.
 */
export function registerAssetProtocolHandler(): void {
  protocol.handle(ASSET_PROTOCOL, (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'local' && url.hostname !== 'bundled') return new Response('Unknown asset source', { status: 404 });
    const source: SpeciesSource = url.hostname;
    const root = source === 'local' ? getLocalSpeciesRoot() : getBundledSpeciesRoot();
    let requestPath: string;
    try {
      requestPath = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Invalid asset path', { status: 400 });
    }
    const resolved = path.resolve(root, `.${requestPath}`);
    const relative = path.relative(root, resolved);

    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(resolved).href);
  });
}
