export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-red-800">
      {message}
    </p>
  );
}
