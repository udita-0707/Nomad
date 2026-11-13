// TODO: email + password form.
// - Validate with loginRequestSchema from @nomad/shared before submitting.
// - useMutation(api.login); on success invalidate ['me'] and navigate('/dashboard').
// - Show loading state and errors (401 -> "Wrong email or password").
export function SignIn() {
  return (
    <main>
      <h1>Sign In</h1>
      <p>TODO: sign in form</p>
    </main>
  );
}
