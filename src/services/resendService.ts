import { AppUser } from '../types';

const RESEND_API_KEY =
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_RESEND_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_RESEND_API_KEY)) ||
  '';

const ADMIN_EMAIL =
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADMIN_EMAIL) ||
    (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL)) ||
  'leonardoricardoarantes@gmail.com';

export interface SendApprovalEmailParams {
  user: AppUser;
  approvalUrl: string;
  rejectionUrl: string;
}

export async function sendUserApprovalRequestEmail({
  user,
  approvalUrl,
  rejectionUrl,
}: SendApprovalEmailParams): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Solicitação de Aprovação de Acesso</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
          Gestão de Metas Comerciais
        </h1>
        <p style="color: #c7d2fe; margin: 6px 0 0 0; font-size: 14px;">
          Novo Pedido de Acesso de Usuário
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px;">
        <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-top: 0;">
          Olá, <strong>Leonardo</strong>! Um novo usuário solicitou acesso ao sistema de <strong>Gestão de Metas Clientes</strong> e está aguardando sua aprovação.
        </p>

        <!-- Detalhes do Usuário -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; margin: 24px 0; border: 1px solid #cbd5e1;">
          <tr>
            <td style="padding: 16px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="4">
                <tr>
                  <td width="35%" style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Nome:</td>
                  <td style="font-size: 14px; color: #0f172a; font-weight: 700;">${user.name}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Usuário:</td>
                  <td style="font-size: 14px; color: #4338ca; font-weight: 700; font-family: monospace;">${user.username}</td>
                </tr>
                ${
                  user.email
                    ? `<tr>
                  <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">E-mail:</td>
                  <td style="font-size: 14px; color: #0f172a;">${user.email}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Papel:</td>
                  <td style="font-size: 13px; color: #0f172a;">${user.role}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Data do Pedido:</td>
                  <td style="font-size: 13px; color: #0f172a;">${new Date(user.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #475569; margin-bottom: 24px; text-align: center;">
          Clique em uma das opções abaixo para autorizar ou recusar o acesso:
        </p>

        <!-- Botões de Ação -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <a href="${approvalUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">
                ✅ APROVAR ACESSO IMEDIATAMENTE
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${rejectionUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #dc2626; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; border: 1px solid #fca5a5;">
                ❌ Recusar Pedido
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Este e-mail foi gerado automaticamente pelo Sistema de Gestão de Metas Clientes via Resend API.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gestão de Metas <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `[Aprovação de Acesso] Novo usuário: ${user.name} (@${user.username})`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('Resend API response warning/error:', data);
      return { success: false, error: data?.message || 'Falha ao enviar e-mail via Resend' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.warn('Resend API offline ou inacessível:', err?.message || err);
    return { success: false, error: err?.message || 'Erro inesperado na chamada do Resend' };
  }
}
