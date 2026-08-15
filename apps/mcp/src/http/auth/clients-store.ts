import { randomUUID } from "node:crypto";

import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

import { insertClient, readClient } from "../../db/oauth.js";
import { logInfo, logWarn } from "../../logger.js";
import { SealedValueError } from "../../secret-box.js";
import type { HttpDeps } from "../deps.js";

// Both registration paths land in the same table: RFC 7591 dynamic registration (deprecated in the
// 2026-07-28 MCP revision but "retained for backwards compatibility", and still how deployed
// clients register), and an operator inserting a row by hand for a pre-registered client.
export function createClientsStore(deps: HttpDeps): OAuthRegisteredClientsStore {
  return {
    getClient: async (clientId) => {
      const record = await readClient(deps.db, clientId);

      if (!record) {
        return undefined;
      }

      // The SDK's client-auth middleware compares this by value, so a confidential client's secret
      // is sealed at rest and opened only here, in memory, for that comparison. A secret this
      // process cannot open means the client can no longer be authenticated — reporting it as an
      // unknown client is both true and actionable (register again), where handing back an
      // undefined secret would silently demote it to a public client that needs no proof at all.
      let clientSecret: string | undefined;

      if (record.sealedClientSecret) {
        try {
          clientSecret = deps.box.open(record.sealedClientSecret);
        } catch (error) {
          if (!(error instanceof SealedValueError)) {
            throw error;
          }

          logWarn(
            `oauth: the sealed secret for client ${record.clientId} could not be decrypted with the current TOKEN_ENCRYPTION_KEY; treating the client as unregistered`,
          );

          return undefined;
        }
      }

      return {
        client_id: record.clientId,
        client_secret: clientSecret,
        client_id_issued_at: record.clientIdIssuedAt,
        client_secret_expires_at: record.clientSecretExpiresAt ?? undefined,
        redirect_uris: record.redirectUris,
        client_name: record.clientName ?? undefined,
        client_uri: record.clientUri ?? undefined,
        scope: record.scope ?? undefined,
        grant_types: record.grantTypes,
        response_types: record.responseTypes,
        token_endpoint_auth_method: record.tokenEndpointAuthMethod,
      };
    },
    registerClient: async (client) => {
      const issued = client as OAuthClientInformationFull;
      const clientId = issued.client_id || randomUUID();
      const clientIdIssuedAt =
        issued.client_id_issued_at ?? Math.floor(Date.now() / 1000);

      await insertClient(deps.db, {
        clientId,
        sealedClientSecret: client.client_secret
          ? deps.box.seal(client.client_secret)
          : null,
        clientIdIssuedAt,
        clientSecretExpiresAt: client.client_secret_expires_at ?? null,
        redirectUris: client.redirect_uris,
        clientName: client.client_name ?? null,
        clientUri: client.client_uri ?? null,
        scope: client.scope ?? null,
        grantTypes: client.grant_types ?? ["authorization_code", "refresh_token"],
        responseTypes: client.response_types ?? ["code"],
        tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? "none",
      });

      logInfo(
        `oauth: registered client ${clientId} (${client.client_name ?? "unnamed"})`,
      );

      return {
        ...client,
        client_id: clientId,
        client_id_issued_at: clientIdIssuedAt,
      };
    },
  };
}
