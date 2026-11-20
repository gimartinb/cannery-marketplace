import { describe, expect, it } from "vitest";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATE_IDS, fillTemplate, sendEmailInput } from "../shared/emailTemplates";
import { emailReady, sendAutomaticEmail, sendEmail, textToHtml } from "../worker/email";

describe("email templates", () => {
  it("has one template per id, and none use dashes", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.map((item) => item.id)).toEqual([...EMAIL_TEMPLATE_IDS]);
    for (const item of DEFAULT_EMAIL_TEMPLATES) expect(/[–—]/.test(item.body + item.subject), item.id).toBe(false);
  });

  it("fills placeholders and drops empty note lines", () => {
    const text = "Hi {firstName},\n\n{note}\n\nWelcome {business}.";
    expect(fillTemplate(text, { firstName: "Maria", business: "Clay Co", note: "" })).toBe("Hi Maria,\n\nWelcome Clay Co.");
    expect(fillTemplate(text, { firstName: "Maria", business: "Clay Co", note: "See you Friday." })).toBe("Hi Maria,\n\nSee you Friday.\n\nWelcome Clay Co.");
    expect(fillTemplate("Hi {unknown}", {})).toBe("Hi {unknown}");
  });

  it("every placeholder a template uses is listed for owners", () => {
    for (const item of DEFAULT_EMAIL_TEMPLATES) {
      const used = new Set([...(item.subject + item.body).matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
      for (const name of used) expect(item.placeholders, `${item.id} uses {${name}}`).toContain(name);
    }
  });

  it("escapes HTML and links web addresses", () => {
    const html = textToHtml("Hi <b>there</b>\n\nGo to https://cannerymarket.com/maker-portal.");
    expect(html).toContain("&lt;b&gt;there&lt;/b&gt;");
    expect(html).toContain('<a href="https://cannerymarket.com/maker-portal"');
  });

  it("validates the send request", () => {
    expect(sendEmailInput.safeParse({ template: "makerWelcome", to: "not an email", subject: "Hello", body: "A message body here" }).success).toBe(false);
    expect(sendEmailInput.safeParse({ template: "makerWelcome", to: "Maker@Example.com", subject: "Hello", body: "A message body here" }).data?.to).toBe("maker@example.com");
  });
});

describe("sending", () => {
  it("is off without a key, explains why, and automatic emails quietly skip", async () => {
    const env = { EMAIL_FROM: "The Cannery Marketplace <hello@cannerymarket.com>" } as never;
    expect(emailReady(env)).toBe(false);
    await expect(sendEmail(env, {} as never, { template: "makerWelcome", to: "a@b.com", subject: "Hi", body: "Hello there", sentBy: "owner@x.com" })).rejects.toThrow(/not set up/);
    await expect(sendAutomaticEmail(env, {} as never, "applicationReceived", "a@b.com", { firstName: "A", business: "B" })).resolves.toBeUndefined();
  });
});
