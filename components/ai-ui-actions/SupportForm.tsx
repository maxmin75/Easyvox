"use client";

import { useState } from "react";
import styles from "@/components/ai-ui-actions/actions.module.css";

type SupportFormProps = {
  topic?: string;
};

export function SupportForm({ topic = "" }: SupportFormProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Support Form</h3>
      {submitted ? (
        <p className={styles.muted}>Richiesta inviata (mock). Riceverai un riscontro via email.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="support-topic">
              Topic
            </label>
            <input id="support-topic" name="topic" className={styles.input} defaultValue={topic} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="support-email">
              Email
            </label>
            <input id="support-email" name="email" type="email" className={styles.input} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="support-description">
              Dettagli
            </label>
            <textarea id="support-description" name="description" className={styles.textarea} />
          </div>

          <div className={styles.buttonRow}>
            <button className={styles.button} type="submit">
              Invia richiesta
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
