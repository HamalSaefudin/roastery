import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { AlertCircleIcon } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingButton } from '../components/shared/loading-button'
import { getErrorMessage } from '../lib/api/client'
import {
  meQueryOptions,
  useLoginMutation,
  useLogoutMutation,
} from '../features/auth/queries'
import { loginSchema } from '../features/auth/login-schema'
import { ROLE_CMS } from '../features/auth/types'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient
      .ensureQueryData(meQueryOptions())
      .catch(() => null)
    // Redirect ke dashboard HANYA kalau sesi valid role CMS — sesi valid
    // tapi role lain (mis. cookie retail ikut kebawa) tetap tampil form
    // login, supaya tidak lompat bolak-balik dengan guard _auth.tsx.
    if (user && ROLE_CMS.includes(user.role)) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const logoutMutation = useLogoutMutation()
  const [errorInline, setErrorInline] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setErrorInline(null)
      try {
        const user = await loginMutation.mutateAsync(value)
        if (!ROLE_CMS.includes(user.role)) {
          await logoutMutation.mutateAsync()
          setErrorInline('Akun ini tidak punya akses CMS')
          return
        }
        await navigate({ to: '/' })
      } catch (err) {
        setErrorInline(getErrorMessage(err))
      }
    },
  })

  const loading = loginMutation.isPending || logoutMutation.isPending

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-heading text-3xl font-bold text-primary">
            ☕ Roastery
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk ke panel admin
          </p>
        </div>

        <form
          className="space-y-4 rounded-xl border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          {errorInline && (
            <div className="flex items-start gap-2 rounded-md bg-bahaya-bg px-3 py-2 text-sm text-bahaya">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{errorInline}</span>
            </div>
          )}

          <form.Field
            name="email"
            validators={{ onBlur: loginSchema.shape.email }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-bahaya">
                    {field.state.meta.errors
                      .map((e) => (typeof e === 'string' ? e : e?.message))
                      .join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{ onBlur: loginSchema.shape.password }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="current-password"
                  disabled={loading}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-bahaya">
                    {field.state.meta.errors
                      .map((e) => (typeof e === 'string' ? e : e?.message))
                      .join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <LoadingButton
            type="submit"
            className="w-full"
            loading={loading}
            loadingText="Masuk…"
          >
            Masuk
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}
