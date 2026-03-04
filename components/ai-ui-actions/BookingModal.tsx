"use client";

import { useState } from "react";
import styles from "@/components/ai-ui-actions/actions.module.css";

type BookingModalProps = {
  date?: string;
  time?: string;
  service?: string;
};

export function BookingModal({ date = "", time = "", service = "" }: BookingModalProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Booking Modal</h3>
      {submitted ? (
        <p className={styles.muted}>Prenotazione inviata (mock). Ti ricontatteremo a breve.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="booking-service">
              Servizio
            </label>
            <input id="booking-service" name="service" className={styles.input} defaultValue={service} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="booking-date">
              Data
            </label>
            <input id="booking-date" name="date" className={styles.input} defaultValue={date} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="booking-time">
              Orario
            </label>
            <input id="booking-time" name="time" className={styles.input} defaultValue={time} />
          </div>

          <div className={styles.buttonRow}>
            <button className={styles.button} type="submit">
              Conferma prenotazione
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
