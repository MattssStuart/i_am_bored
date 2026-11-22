import { useState, type FormEvent } from 'react'
import './ContactForm.css'

type FormData = {
  name: string
  email: string
  message: string
}

const emptyForm: FormData = { name: '', email: '', message: '' }

function ContactForm() {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitted, setSubmitted] = useState(false)

  const update = (field: keyof FormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // TODO: send the response somewhere — for now just log it
    console.log('Form submitted:', form)
    setSubmitted(true)
    setForm(emptyForm)
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Get in touch</h1>
        <p className="subtitle">Fill this in and I'll get back to you.</p>

        <label className="field">
          <span>Name</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name')(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Message</span>
          <textarea
            rows={5}
            required
            value={form.message}
            onChange={(e) => update('message')(e.target.value)}
          />
        </label>

        <button type="submit">Send</button>

        {submitted && <p className="success">Thanks! Your response was received.</p>}
      </form>
    </main>
  )
}

export default ContactForm
