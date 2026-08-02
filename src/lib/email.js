import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;

function emailIsConfigured() {
  return Boolean(config.emailUser && config.emailPass);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort,
      secure: config.emailSecure,
      auth: {
        user: config.emailUser,
        pass: config.emailPass,
      },
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendWelcomeEmail(customer) {
  if (!emailIsConfigured()) {
    console.warn("Correo de bienvenida omitido: EMAIL_USER o EMAIL_PASS no están configurados.");
    return { sent: false, reason: "not_configured" };
  }

  const safeName = escapeHtml(customer.name);
  const from = config.emailFrom || `System Lab <${config.emailUser}>`;

  await getTransporter().sendMail({
    from,
    to: customer.email,
    subject: "¡Bienvenido al Club Jamiro!",
    text: `Hola ${customer.name},\n\nTu cuenta en el Club Jamiro fue creada correctamente.\n\nTu identificación de cliente es ${customer.customerCode}. Desde ahora podés acumular puntos por tus compras y por tus referidos.\n\nIngresá en https://www.jamirosc.com/login\n\nTaller Automotriz Jamiro\nCorreo enviado por System Lab.`,
    html: `
      <div style="margin:0;background:#f3f4f6;padding:32px 16px;font-family:Arial,sans-serif;color:#172033">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#111827;padding:28px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:25px">Taller Automotriz Jamiro</h1>
            <p style="margin:8px 0 0;color:#f59e0b;font-weight:700">CLUB JAMIRO</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 16px">¡Bienvenido, ${safeName}!</h2>
            <p style="line-height:1.6">Tu cuenta y tu tarjeta digital fueron creadas correctamente.</p>
            <div style="margin:24px 0;padding:18px;background:#f9fafb;border-left:4px solid #f59e0b;border-radius:8px">
              <span style="display:block;color:#6b7280;font-size:12px;text-transform:uppercase">Identificación de cliente</span>
              <strong style="display:block;margin-top:6px;font-size:20px">${escapeHtml(customer.customerCode)}</strong>
            </div>
            <p style="line-height:1.6">Desde ahora podés acumular puntos por tus compras y también por tus referidos.</p>
            <p style="margin:28px 0;text-align:center">
              <a href="https://www.jamirosc.com/login" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:8px">Ingresar a mi cuenta</a>
            </p>
            <p style="margin-bottom:0;color:#6b7280;font-size:13px">Este correo fue enviado por System Lab para Taller Automotriz Jamiro.</p>
          </div>
        </div>
      </div>
    `,
  });

  return { sent: true };
}
