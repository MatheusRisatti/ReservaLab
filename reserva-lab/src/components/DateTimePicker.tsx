import React, { useEffect, useMemo, useRef, useState } from 'react';

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  minDate?: Date;
  maxDate?: Date;
  rangeStart?: Date;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  defaultHour?: number;
  lockedReasonHint?: string;
  variant?: 'popover' | 'modal';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const QUICK_HOURS = ['08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const MINUTE_OPTIONS = [0, 15, 30, 45];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateTimeString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  rangeStart,
  disabled = false,
  hasError = false,
  placeholder = 'Escolher dia',
  defaultHour = 10,
  lockedReasonHint,
  variant = 'popover',
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const [activeStep, setActiveStep] = useState<'date' | 'time'>('date');
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedValue = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [value]);

  const initialMonthBase = parsedValue ?? minDate ?? new Date();
  const [viewYear, setViewYear] = useState<number>(() => initialMonthBase.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialMonthBase.getMonth());

  const isModalVariant = variant === 'modal';

  // Fechar ao clicar fora quando for popover flutuante
  useEffect(() => {
    if (!isOpen || isModalVariant) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  const handleToggleOpen = () => {
    if (disabled) return;
    const base = parsedValue ?? minDate ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setActiveStep('date');
    setOpen(!isOpen);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ date: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(viewYear, viewMonth, day) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const isDayBeforeMin = (day: Date): boolean => {
    if (!minDate) return false;
    return endOfDay(day).getTime() < minDate.getTime();
  };

  const isDayAfterMax = (day: Date): boolean => {
    if (!maxDate) return false;
    return startOfDay(day).getTime() > maxDate.getTime();
  };

  const handleSelectDay = (day: Date) => {
    if (isDayBeforeMin(day) || isDayAfterMax(day)) return;

    let hours = parsedValue ? parsedValue.getHours() : defaultHour;
    let minutes = parsedValue ? parsedValue.getMinutes() : 0;

    const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
    if (minDate && candidate.getTime() <= minDate.getTime()) {
      const safeMin = new Date(minDate.getTime() + 60 * 60 * 1000);
      if (isSameCalendarDay(day, safeMin)) {
        hours = safeMin.getHours();
        minutes = safeMin.getMinutes() > 30 ? 45 : safeMin.getMinutes() > 15 ? 30 : safeMin.getMinutes() > 0 ? 15 : 0;
      }
    }
    if (maxDate) {
      const afterMinAdjust = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
      if (afterMinAdjust.getTime() > maxDate.getTime() && isSameCalendarDay(day, maxDate)) {
        hours = maxDate.getHours();
        minutes = maxDate.getMinutes();
      }
    }

    const updated = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
    onChange(toLocalDateTimeString(updated));
    setActiveStep('time');
  };

  const handleSelectHourMinute = (newHour: number, newMinute: number) => {
    const baseDate = parsedValue ?? minDate ?? new Date(Date.now() + 3600000);
    const updated = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      newHour,
      newMinute,
      0,
      0
    );
    onChange(toLocalDateTimeString(updated));
  };

  const selectedHour = parsedValue ? parsedValue.getHours() : defaultHour;
  const selectedMinute = parsedValue ? parsedValue.getMinutes() : 0;

  const formattedDateDisplay = parsedValue
    ? parsedValue.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const formattedTimeDisplay = parsedValue
    ? `${pad2(parsedValue.getHours())}:${pad2(parsedValue.getMinutes())}`
    : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.28rem',
      }}
    >
      <span
        style={{
          fontSize: '0.84rem',
          fontWeight: 600,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>

      {/* Botão Gatilho Compacto (100% contido na largura do pai) */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: isModalVariant ? '0.48rem 0.65rem' : '0.5rem 0.7rem',
          borderRadius: '11px',
          border: hasError
            ? '2px solid var(--danger)'
            : isOpen
            ? '2px solid var(--primary)'
            : '1px solid var(--border)',
          backgroundColor: disabled ? 'var(--soft)' : 'var(--page)',
          color: 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          textAlign: 'left',
          boxShadow: hasError
            ? '0 0 0 2px color-mix(in srgb, var(--danger), transparent 78%)'
            : isOpen
            ? '0 0 0 2px color-mix(in srgb, var(--primary), transparent 78%)'
            : 'none',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: '1 1 0%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: parsedValue ? 'color-mix(in srgb, var(--primary), transparent 84%)' : 'var(--soft)',
              color: 'var(--primary)',
              fontSize: '0.88rem',
              flexShrink: 0,
            }}
          >
            📅
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '0.66rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--muted)',
                fontWeight: 650,
                lineHeight: 1.15,
              }}
            >
              Data
            </span>
            <span
              style={{
                fontSize: '0.86rem',
                fontWeight: parsedValue ? 650 : 450,
                color: parsedValue ? 'var(--text)' : 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.25,
              }}
            >
              {formattedDateDisplay ?? placeholder}
            </span>
          </div>
        </div>

        {/* Pílula do Relógio compacta e sempre visível */}
        <div
          onClick={(e) => {
            if (disabled) return;
            e.stopPropagation();
            if (!isOpen) {
              const base = parsedValue ?? minDate ?? new Date();
              setViewYear(base.getFullYear());
              setViewMonth(base.getMonth());
              setOpen(true);
            }
            setActiveStep('time');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.28rem 0.55rem',
            borderRadius: '8px',
            backgroundColor: parsedValue ? 'var(--btn)' : 'var(--soft)',
            color: parsedValue ? 'var(--on-btn)' : 'var(--primary)',
            border: parsedValue ? '1px solid transparent' : '1px dashed var(--primary)',
            fontWeight: 700,
            fontSize: '0.8rem',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          title="Definir horário (Relógio)"
        >
          <span aria-hidden="true">🕒</span>
          <span>{formattedTimeDisplay ?? 'Hora'}</span>
        </div>
      </button>

      {/* Painel do Calendário e Relógio (Inline compacto no modal, ou Popover no catálogo) */}
      {isOpen && (
        <div
          className="card"
          style={
            isModalVariant
              ? {
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginTop: '0.2rem',
                  padding: '0.7rem',
                  borderRadius: '12px',
                  border: '1px solid var(--primary)',
                  backgroundColor: 'var(--surface)',
                }
              : {
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 100,
                  width: 'min(310px, 90vw)',
                  padding: '0.8rem',
                  borderRadius: '14px',
                  border: '1px solid var(--primary)',
                  boxShadow: '0 14px 32px rgba(10, 30, 20, 0.24)',
                  backgroundColor: 'var(--surface)',
                }
          }
          onClick={(e) => e.stopPropagation()}
        >
          {/* Abas internas: 1. Dia (Calendário) | 2. Hora (Relógio) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.3rem',
              padding: '0.2rem',
              borderRadius: '9px',
              backgroundColor: 'var(--soft)',
              marginBottom: '0.6rem',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveStep('date')}
              style={{
                padding: '0.32rem 0.45rem',
                borderRadius: '7px',
                border: 'none',
                fontWeight: 650,
                fontSize: '0.78rem',
                cursor: 'pointer',
                backgroundColor: activeStep === 'date' ? 'var(--btn)' : 'transparent',
                color: activeStep === 'date' ? 'var(--on-btn)' : 'var(--text)',
                transition: 'all 120ms ease',
              }}
            >
              📅 1. Dia
            </button>
            <button
              type="button"
              onClick={() => setActiveStep('time')}
              style={{
                padding: '0.32rem 0.45rem',
                borderRadius: '7px',
                border: 'none',
                fontWeight: 650,
                fontSize: '0.78rem',
                cursor: 'pointer',
                backgroundColor: activeStep === 'time' ? 'var(--btn)' : 'transparent',
                color: activeStep === 'time' ? 'var(--on-btn)' : 'var(--text)',
                transition: 'all 120ms ease',
              }}
            >
              🕒 2. Horário ({pad2(selectedHour)}:{pad2(selectedMinute)})
            </button>
          </div>

          {activeStep === 'date' ? (
            <div>
              {/* Navegação de Mês */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.4rem',
                }}
              >
                <button
                  type="button"
                  onClick={prevMonth}
                  className="btn btn-outline"
                  style={{ padding: '0.12rem 0.5rem', fontSize: '0.88rem', borderRadius: '7px' }}
                  aria-label="Mês anterior"
                >
                  ‹
                </button>
                <strong style={{ fontSize: '0.86rem', color: 'var(--text)' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </strong>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="btn btn-outline"
                  style={{ padding: '0.12rem 0.5rem', fontSize: '0.88rem', borderRadius: '7px' }}
                  aria-label="Próximo mês"
                >
                  ›
                </button>
              </div>

              {/* Dias da Semana */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--muted)',
                  marginBottom: '0.2rem',
                }}
              >
                {WEEKDAYS.map((dayName) => (
                  <span key={dayName}>{dayName}</span>
                ))}
              </div>

              {/* Grade Compacta de Dias */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '0.16rem',
                }}
              >
                {calendarCells.map((cell, index) => {
                  if (!cell.date) {
                    return <span key={`empty-${index}`} />;
                  }

                  const day = cell.date;
                  const beforeMin = isDayBeforeMin(day);
                  const afterMax = isDayAfterMax(day);
                  const isDisabled = beforeMin || afterMax;
                  const isSelected = parsedValue ? isSameCalendarDay(day, parsedValue) : false;
                  const isRangeStart = rangeStart ? isSameCalendarDay(day, rangeStart) : false;
                  const isInRange =
                    rangeStart &&
                    parsedValue &&
                    startOfDay(day).getTime() > startOfDay(rangeStart).getTime() &&
                    startOfDay(day).getTime() < startOfDay(parsedValue).getTime();

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelectDay(day)}
                      title={
                        afterMax && lockedReasonHint
                          ? lockedReasonHint
                          : beforeMin
                          ? 'Data indisponível'
                          : day.toLocaleDateString('pt-BR')
                      }
                      style={{
                        height: '28px',
                        padding: 0,
                        borderRadius: '6px',
                        border: isRangeStart && !isSelected ? '1px dashed var(--primary)' : 'none',
                        fontSize: '0.78rem',
                        fontWeight: isSelected || isRangeStart ? 700 : 500,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--btn)'
                          : isInRange || isRangeStart
                          ? 'var(--soft)'
                          : 'transparent',
                        color: isSelected
                          ? 'var(--on-btn)'
                          : isDisabled
                          ? 'var(--muted)'
                          : 'var(--text)',
                        opacity: isDisabled ? 0.35 : 1,
                        textDecoration: afterMax ? 'line-through' : 'none',
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              {maxDate && lockedReasonHint && (
                <div
                  style={{
                    marginTop: '0.45rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '7px',
                    backgroundColor: 'var(--soft)',
                    fontSize: '0.72rem',
                    color: 'var(--muted)',
                    lineHeight: 1.3,
                  }}
                >
                  🔒 Limite padrão: até <strong>{maxDate.toLocaleDateString('pt-BR')}</strong>.
                </div>
              )}
            </div>
          ) : (
            /* Aba 2: Relógio Visual Compacto */
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '0.3rem',
                  marginBottom: '0.55rem',
                }}
              >
                {QUICK_HOURS.map((slot) => {
                  const [hStr, mStr] = slot.split(':');
                  const h = Number(hStr);
                  const m = Number(mStr);
                  const isCurrentSlot = selectedHour === h && selectedMinute === m;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        handleSelectHourMinute(h, m);
                        if (isModalVariant) setOpen(false);
                      }}
                      style={{
                        padding: '0.32rem 0.2rem',
                        borderRadius: '7px',
                        border: isCurrentSlot ? '1px solid var(--btn)' : '1px solid var(--border)',
                        backgroundColor: isCurrentSlot ? 'var(--btn)' : 'var(--page)',
                        color: isCurrentSlot ? 'var(--on-btn)' : 'var(--text)',
                        fontWeight: 650,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.74rem', fontWeight: 600 }}>
                  Hora (00h–23h)
                  <select
                    className="input"
                    style={{ padding: '0.32rem 0.45rem', fontSize: '0.82rem' }}
                    value={selectedHour}
                    onChange={(e) => handleSelectHourMinute(Number(e.target.value), selectedMinute)}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {pad2(h)}h
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.74rem', fontWeight: 600 }}>
                  Minutos
                  <select
                    className="input"
                    style={{ padding: '0.32rem 0.45rem', fontSize: '0.82rem' }}
                    value={selectedMinute}
                    onChange={(e) => handleSelectHourMinute(selectedHour, Number(e.target.value))}
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {pad2(m)} min
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Rodapé compacto */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.45rem',
              borderTop: '1px solid var(--border)',
              marginTop: '0.45rem',
            }}
          >
            {parsedValue ? (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.15rem 0.35rem',
                }}
              >
                Limpar
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              className="btn"
              style={{ padding: '0.28rem 0.75rem', fontSize: '0.78rem', borderRadius: '7px' }}
              onClick={() => setOpen(false)}
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
