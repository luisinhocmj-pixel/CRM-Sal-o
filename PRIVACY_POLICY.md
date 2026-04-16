# Política de Retenção e Privacidade de Dados - Luxe Beauty CRM

## 1. Coleta de Dados
O Luxe Beauty CRM coleta dados de clientes e atendimentos inseridos pelos usuários (salões de beleza) para fins de gestão e fidelização.

## 2. Portabilidade de Dados (LGPD Art. 18)
Todo usuário tem o direito de exportar seus dados a qualquer momento. O sistema fornece uma ferramenta de exportação em formato JSON na aba de **Ajustes > Dados**.

## 3. Retenção de Dados e Soft Delete
Para garantir a segurança e evitar perdas acidentais, o sistema utiliza uma política de **Soft Delete**:
- Quando um registro (cliente ou agendamento) é excluído, ele é marcado como `deleted_at` no banco de dados.
- O registro torna-se invisível na interface do usuário imediatamente.
- Os dados permanecem em nosso banco de dados por um período de **30 dias** para fins de auditoria e recuperação em caso de erro.
- Após o período de 30 dias, os dados são permanentemente excluídos de nossos servidores.

## 4. Cancelamento de Conta
Em caso de cancelamento da assinatura:
- O acesso à escrita de novos dados é bloqueado.
- O acesso à leitura e exportação de dados existentes permanece disponível por **30 dias**, garantindo o direito de portabilidade do usuário.
- Após 30 dias do cancelamento efetivo, todos os dados associados ao tenant serão programados para exclusão definitiva.

## 5. Segurança
Os dados são isolados por `user_id` utilizando Row Level Security (RLS) no nível do banco de dados PostgreSQL, garantindo que nenhum salão tenha acesso aos dados de outro.

---
*Última atualização: 15 de Abril de 2026*
