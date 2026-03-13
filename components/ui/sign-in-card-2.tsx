"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

function Input({ className, type, icon, ...props }: React.ComponentProps<"input"> & { icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
          {icon}
        </span>
      ) : null}
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-white outline-none transition md:text-sm",
          "placeholder:text-white/35 focus:border-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/10",
          icon ? "pl-10" : "",
          className,
        )}
        {...props}
      />
    </div>
  );
}

type SignInCard2Props = {
  open: boolean;
  name: string;
  email: string;
  error?: string;
  profilingRequired?: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmitIdentity: () => void;
  onAnonymous: () => void;
};

export function SignInCard2({
  open,
  name,
  email,
  error,
  profilingRequired = false,
  onNameChange,
  onEmailChange,
  onSubmitIdentity,
  onAnonymous,
}: SignInCard2Props) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-220, 220], [8, -8]);
  const rotateY = useTransform(mouseX, [-220, 220], [-8, 8]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] grid place-items-center bg-[rgba(8,15,28,0.14)] px-4 pb-32 pt-6 backdrop-blur-[4px]">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm"
        style={{ perspective: 1500 }}
      >
        <motion.div
          style={{ rotateX, rotateY }}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            mouseX.set(event.clientX - rect.left - rect.width / 2);
            mouseY.set(event.clientY - rect.top - rect.height / 2);
          }}
          onMouseLeave={() => {
            mouseX.set(0);
            mouseY.set(0);
          }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/45 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(168,85,247,0.18),rgba(17,24,39,0.05)_32%,rgba(0,0,0,0.55))]" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
            <motion.div
              className="absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-fuchsia-400/20 blur-3xl"
              animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 5.5, repeat: Infinity }}
            />

            <div className="relative z-10 space-y-5">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-inner shadow-white/5">
                  <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-lg font-bold text-transparent">
                    E
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Accesso chat</p>
                  <h3 className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-xl font-semibold text-transparent">
                    Scegli come entrare
                  </h3>
                  <p className="text-xs leading-5 text-white/60">
                    Usa il tuo profilo per mantenere memoria cliente tra sessioni oppure avvia un test rapido.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  type="text"
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Nome e cognome"
                  icon={<User className="h-4 w-4" />}
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="email@dominio.com"
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={error ? "error" : "hint"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn("text-xs leading-5", error ? "text-rose-300" : "text-white/55")}
                >
                  {error ?? "Nome ed email sbloccano memoria cliente, storico e risposte piu rilevanti."}
                </motion.p>
              </AnimatePresence>

              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onSubmitIdentity}
                  className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 text-sm font-medium text-black"
                >
                  <span>Entra con profilo</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: profilingRequired ? 1 : 1.02 }}
                  whileTap={{ scale: profilingRequired ? 1 : 0.98 }}
                  type="button"
                  onClick={onAnonymous}
                  disabled={profilingRequired}
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                    profilingRequired
                      ? "cursor-not-allowed border-white/8 bg-white/5 text-white/30"
                      : "border-white/12 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10",
                  )}
                >
                  Test anonimo
                </motion.button>
              </div>

              {profilingRequired ? (
                <p className="text-xs text-white/45">Per questo tenant il test anonimo non e disponibile.</p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
