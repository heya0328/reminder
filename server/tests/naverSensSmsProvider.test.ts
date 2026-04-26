import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNaverSensSignature, NaverSensSmsProvider } from "../src/providers/naverSensSmsProvider.ts";

describe("NaverSensSmsProvider", () => {
  it("creates the SENS v2 HMAC signature", () => {
    const signature = createNaverSensSignature({
      method: "POST",
      uri: "/sms/v2/services/ncp:sms:kr:123:test/messages",
      timestamp: "1700000000000",
      accessKey: "access-key",
      secretKey: "secret-key",
    });

    assert.equal(signature, "ZKsCEU3LjzTGa/RSvbVl66FfxiIjnjnG61UYjBqTaRg=");
  });

  it("sends a fixed SMS template through SENS", async () => {
    let requestedUrl = "";
    let requestedBody: any = null;
    const provider = new NaverSensSmsProvider({
      accessKey: "access-key",
      secretKey: "secret-key",
      serviceId: "ncp:sms:kr:123:test",
      fromNumber: "010-1111-2222",
      baseUrl: "https://example.test",
      fetchImpl: async (url, init) => {
        requestedUrl = String(url);
        requestedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            requestId: "request-1",
            statusCode: "202",
            statusName: "success",
          }),
          { status: 202 },
        );
      },
    });

    const result = await provider.send({
      userId: "user-1",
      reminderId: "reminder-1",
      title: "병원 예약",
      phoneNumber: "010-3333-4444",
    });

    assert.equal(result.ok, true);
    assert.equal(result.providerMessageId, "request-1");
    assert.equal(requestedUrl, "https://example.test/sms/v2/services/ncp:sms:kr:123:test/messages");
    assert.equal(requestedBody.from, "01011112222");
    assert.equal(requestedBody.messages[0].to, "01033334444");
    assert.equal(requestedBody.content.includes("병원 예약"), false);
  });

  it("returns SENS error messages for failed requests", async () => {
    const provider = new NaverSensSmsProvider({
      accessKey: "access-key",
      secretKey: "secret-key",
      serviceId: "ncp:sms:kr:123:test",
      fromNumber: "010-1111-2222",
      baseUrl: "https://example.test",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            status: 404,
            errorMessage: "'from' is not an authenticated tel number.",
          }),
          { status: 404 },
        ),
    });

    const result = await provider.send({
      userId: "user-1",
      reminderId: "reminder-1",
      title: "병원 예약",
      phoneNumber: "010-3333-4444",
    });

    assert.equal(result.ok, false);
    assert.equal(result.errorReason, "'from' is not an authenticated tel number.");
  });
});
