import type { RequestHandler } from "express";

// DNS-rebinding defence. The transport's own `allowedOrigins` option is deprecated in SDK 1.30 in
// favour of external middleware ("Use external middleware for DNS rebinding protection instead"),
// so origin checking lives here alongside the SDK's `hostHeaderValidation`.
//
// A request with no Origin header is not a browser request and cannot be a rebinding attack;
// rejecting those would break every command-line and desktop MCP client.
export function originValidation(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (origin === undefined || allowed.has(origin)) {
      next();

      return;
    }

    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: `Origin ${origin} is not allowed to reach this MCP server.`,
      },
      id: null,
    });
  };
}
