# Super Admin setup

## Required application runtime configuration

Set these server-side environment variables in the Vercel project for every environment that serves the application:

- `DATABASE_URL`: the connection string for the production PostgreSQL database.
- `WARD_SESSION_SECRET`: a private, random secret used to sign login sessions. Generate at least 32 random bytes (for example, with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), and store it only in Vercel's environment-variable settings. Do not commit it or expose it as a `NEXT_PUBLIC_` variable.

Apply the committed Prisma migrations to that database with `npx prisma migrate deploy` before deploying application changes that depend on the schema.

If `WARD_SESSION_SECRET` is missing, sign-in cannot issue a secure session cookie.

## Super Admin bootstrap

Super Admin setup is a one-time bootstrap and does not create a Ward access request.

Configure these server-side environment variables in the deployment:

- `ADMIN_EMAIL`: the email address that will own the Super Admin account.
- `SUPER_ADMIN_SIGNUP_SECRET`: a private secret of at least 32 characters. Keep it in the deployment's secret manager; do not expose it as a `NEXT_PUBLIC_` variable or commit it to source control.

Open `/super-admin/signup` and create the account using the configured email address and secret. Then sign in through `/sign-in`; Super Admin accounts are redirected to `/super-admin`, where pending access requests can be approved or declined.

The Super Admin can approve a request with the `All access` role. That role can use all standard Ward 3D pages and actions, including editing any in-progress handover, but cannot open the Super Admin dashboard or grant the `All access` role to another account. Only the Super Admin can grant it. Existing role-specific restrictions, such as requiring a second active NIC to confirm handover sign-off, remain in effect.

Signup is disabled unless both environment variables are configured, and the endpoint refuses setup after a Super Admin account already exists.
