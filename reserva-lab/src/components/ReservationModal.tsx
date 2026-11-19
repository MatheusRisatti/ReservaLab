import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import type { Item } from '../types';
import { formatDurationSummary } from '../utils/dateFormat';
import { DateTimePicker } from './DateTimePicker';

interface ReservationModalProps {
  item: Item;
  pickupAt: string;
  returnAt: string;
  maxRentDays?: number;
  onClose: () => void;
  onConfirmed: (wasExtendedRequest?: boolean) => void;
  onConflict: () => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  item,
  pickupAt,
  returnAt,
  maxRentDays = 14,
  onClose,
  onConfirmed,
  onConflict,
}) => {
  const initialExceedsMax = useMemo(() => {
    if (!pickupAt || !returnAt) return false;
    const diffDays = (new Date(returnAt).getTime() - new Date(pickupAt).getTime()) / MS_PER_DAY;
    return diffDays > maxRentDays;
  }, [pickupAt, returnAt, maxRentDays]);

  const [modalPickupAt, setModalPickupAt] = useState(pickupAt || '');
  const [modalReturnAt, setModalReturnAt] = useState(returnAt || '');
  const [openPicker, setOpenPicker] = useState<'pickup' | 'return' | null>(null);
  const [isExtendedMode, setIsExtendedMode] = useState<boolean>(initialExceedsMax);
  const [requestReason, setRequestReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [highlightHint, setHighlightHint] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const reasonTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const hasBothDates = modalPickupAt.trim() !== '' && modalReturnAt.trim() !== '';

  const requestedDays = useMemo(() => {
    if (!hasBothDates) return 0;
    const p = new Date(modalPickupAt).getTime();
    const r = new Date(modalReturnAt).getTime();
    if (Number.isNaN(p) || Number.isNaN(r)) return 0;
    return (r - p) / MS_PER_DAY;
  }, [hasBothDates, modalPickupAt, modalReturnAt]);

  const exceedsStandardLimit = hasBothDates && requestedDays > maxRentDays;
  const requiresJustification = isExtendedMode || exceedsStandardLimit;

  const maxAllowedReturnDate = useMemo(() => {
    if (isExtendedMode || !modalPickupAt) return undefined;
    const pickupDate = new Date(modalPickupAt);
    if (Number.isNaN(pickupDate.getTime())) return undefined;
    return new Date(pickupDate.getTime() + maxRentDays * MS_PER_DAY);
  }, [isExtendedMode, modalPickupAt, maxRentDays]);

  let validationMessage = '';
  if (!hasBothDates) {
    validationMessage =
      'Para concluir a reserva, selecione a data e o horário de retirada e de devolução nos seletores acima.';
  } else {
    const pickupTime = new Date(modalPickupAt).getTime();
    const returnTime = new Date(modalReturnAt).getTime();
    if (Number.isNaN(pickupTime) || Number.isNaN(returnTime)) {
      validationMessage = 'Informe datas e horários válidos para retirada e devolução.';
    } else if (pickupTime <= nowMs) {
      validationMessage = 'A data e o horário de retirada devem estar no futuro.';
    } else if (returnTime <= pickupTime) {
      validationMessage = 'A devolução deve ser posterior à data e horário de retirada.';
    } else if (exceedsStandardLimit && !isExtendedMode) {
      validationMessage = `O período escolhido ultrapassa o limite padrão de ${maxRentDays} dias. Clique em "Solicitar prazo maior" abaixo para justificar o pedido.`;
    } else if (requiresJustification && requestReason.trim().length < 5) {
      validationMessage =
        'Para solicitar um prazo maior, preencha o campo de justificativa explicando o motivo (mínimo de 5 caracteres).';
    }
  }

  const isFormReady = hasBothDates && validationMessage === '';

  const triggerHighlight = () => {
    setHighlightHint(false);
    setTimeout(() => setHighlightHint(true), 15);
    if (hasBothDates && requiresJustification && requestReason.trim().length < 5) {
      reasonTextareaRef.current?.focus();
    }
  };

  const handleToggleExtendedMode = () => {
    setHighlightHint(false);
    setError('');
    setOpenPicker(null);
    if (!isExtendedMode) {
      setIsExtendedMode(true);
      setTimeout(() => reasonTextareaRef.current?.focus(), 60);
    } else {
      setIsExtendedMode(false);
      setRequestReason('');
      if (modalPickupAt && modalReturnAt) {
        const diff = (new Date(modalReturnAt).getTime() - new Date(modalPickupAt).getTime()) / MS_PER_DAY;
        if (diff > maxRentDays) {
          setModalReturnAt('');
        }
      }
    }
  };

  const handleConfirm = async () => {
    if (!isFormReady) {
      triggerHighlight();
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const payload: {
        item_id: string;
        expected_pickup_at: string;
        expected_return_at: string;
        request_reason?: string;
      } = {
        item_id: item.id,
        expected_pickup_at: new Date(modalPickupAt).toISOString(),
        expected_return_at: new Date(modalReturnAt).toISOString(),
      };

      if (requiresJustification && requestReason.trim()) {
        payload.request_reason = requestReason.trim();
      }

      await api.post('/api/reservations', payload);
      onConfirmed(requiresJustification && exceedsStandardLimit);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível concluir a reserva. Tente novamente.'));
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status === 409
      ) {
        onConflict();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pickupDateObj = modalPickupAt ? new Date(modalPickupAt) : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          padding: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '0.35rem',
          }}
        >
          <h2 id="reservation-modal-title" style={{ margin: 0, fontSize: '1.3rem' }}>
            {requiresJustification ? 'Solicitar Prazo Maior' : 'Confirmar Reserva'}
          </h2>
          <span className="badge" title="Prazo máximo padrão definido pelo Administrador">
            Prazo máximo: até {maxRentDays} {maxRentDays === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        <p style={{ marginBottom: '0.85rem', fontSize: '0.92rem' }}>
          <strong>{item.name}</strong>
          <span className="muted"> · Patrimônio {item.patrimony_code}</span>
        </p>

        {/* Seletores Visuais de Data e Relógio encaixados 100% na largura do modal */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '0.65rem',
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '0.75rem',
          }}
        >
          <DateTimePicker
            variant="modal"
            label="1. Data e Horário de Retirada"
            value={modalPickupAt}
            minDate={new Date(nowMs)}
            defaultHour={9}
            hasError={highlightHint && !modalPickupAt.trim()}
            placeholder="Escolher dia de retirada"
            isOpen={openPicker === 'pickup'}
            onOpenChange={(open) => setOpenPicker(open ? 'pickup' : null)}
            onChange={(val) => {
              setNowMs(Date.now());
              setModalPickupAt(val);
              setHighlightHint(false);
              setError('');
              if (!isExtendedMode && val && modalReturnAt) {
                const maxAllowed = new Date(val).getTime() + maxRentDays * MS_PER_DAY;
                if (new Date(modalReturnAt).getTime() > maxAllowed) {
                  setModalReturnAt('');
                }
              }
            }}
          />

          <DateTimePicker
            variant="modal"
            label={
              isExtendedMode
                ? '2. Data e Horário de Devolução (Prazo Estendido)'
                : `2. Data e Horário de Devolução (Máx. ${maxRentDays} dias)`
            }
            value={modalReturnAt}
            minDate={pickupDateObj ?? new Date(nowMs)}
            maxDate={maxAllowedReturnDate}
            rangeStart={pickupDateObj}
            defaultHour={18}
            hasError={highlightHint && !modalReturnAt.trim()}
            placeholder="Escolher dia de devolução"
            lockedReasonHint={`Use "Solicitar prazo maior" caso precise superar ${maxRentDays} dias.`}
            isOpen={openPicker === 'return'}
            onOpenChange={(open) => setOpenPicker(open ? 'return' : null)}
            onChange={(val) => {
              setNowMs(Date.now());
              setModalReturnAt(val);
              setHighlightHint(false);
              setError('');
            }}
          />
        </div>

        {/* Enquanto o calendário/relógio não estiver expandido, mostra os blocos complementares sem criar barra de rolagem */}
        {openPicker === null && (
          <>
            {/* Barra de Solicitação de Prazo Maior */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '10px',
                backgroundColor: isExtendedMode ? 'var(--warning-soft)' : 'var(--soft)',
                border: isExtendedMode ? '1px solid var(--warning)' : '1px solid var(--border)',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                {isExtendedMode ? (
                  <span>
                    ⏳ <strong>Prazo maior ativo:</strong> datas além de {maxRentDays} dias liberadas.
                  </span>
                ) : (
                  <span>
                    Precisa ficar com o equipamento por mais de <strong>{maxRentDays} dias</strong>?
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.78rem',
                  borderRadius: '7px',
                  fontWeight: 650,
                }}
                onClick={handleToggleExtendedMode}
              >
                {isExtendedMode ? 'Voltar ao prazo padrão' : 'Solicitar prazo maior'}
              </button>
            </div>

            {/* Seção de Justificativa e Aviso de Análise do Admin */}
            {requiresJustification && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--page)',
                  border: '1px solid var(--warning)',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  className="badge badge-warning"
                  style={{ marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.74rem' }}
                >
                  ⚠️ Sujeito à Análise do Administrador
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem', lineHeight: 1.38 }}>
                  Seu pedido ficará <strong>Em Análise</strong> (com o item já reservado preventivamente) e você verá o resultado em Minhas Reservas.
                </p>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  Justificativa para o prazo maior (obrigatório)
                  <textarea
                    ref={reasonTextareaRef}
                    className="input"
                    rows={2}
                    placeholder="Explique por que precisa do equipamento por um período maior..."
                    value={requestReason}
                    onChange={(e) => {
                      setRequestReason(e.target.value);
                      setHighlightHint(false);
                      setError('');
                    }}
                    style={{
                      resize: 'none',
                      fontSize: '0.84rem',
                      padding: '0.45rem 0.6rem',
                      ...(highlightHint && requestReason.trim().length < 5
                        ? {
                            borderColor: 'var(--danger)',
                            boxShadow: '0 0 0 2px color-mix(in srgb, var(--danger), transparent 75%)',
                          }
                        : {}),
                    }}
                  />
                </label>
              </div>
            )}

            {/* Mensagem de Orientação / Destaque ou Resumo do Período */}
            {!isFormReady ? (
              <div
                role="status"
                aria-live="polite"
                className={highlightHint ? 'alert alert-error' : 'alert'}
                style={{
                  marginBottom: '0.85rem',
                  fontSize: '0.84rem',
                  padding: '0.5rem 0.75rem',
                  transition: 'all 180ms ease',
                  fontWeight: highlightHint ? 650 : 450,
                  boxShadow: highlightHint
                    ? '0 0 0 2px color-mix(in srgb, var(--danger), transparent 75%)'
                    : undefined,
                }}
              >
                {highlightHint ? `⚠️ Atenção: ${validationMessage}` : validationMessage}
              </div>
            ) : (
              <dl
                style={{
                  margin: '0 0 0.85rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '9px',
                  background: 'var(--soft)',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '0.2rem 0.85rem',
                  fontSize: '0.84rem',
                }}
              >
                <dt className="muted">Retirada</dt>
                <dd style={{ margin: 0, fontWeight: 650 }}>{formatDateTime(modalPickupAt)}</dd>
                <dt className="muted">Devolução</dt>
                <dd style={{ margin: 0, fontWeight: 650 }}>{formatDateTime(modalReturnAt)}</dd>
                <dt className="muted">Tempo total</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: 'var(--primary)' }}>
                  {formatDurationSummary(modalPickupAt, modalReturnAt)}
                  {exceedsStandardLimit ? ` (acima de ${maxRentDays} dias)` : ''}
                </dd>
              </dl>
            )}
          </>
        )}

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '0.75rem', fontSize: '0.84rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleConfirm}
            disabled={submitting}
            aria-disabled={!isFormReady || submitting}
            title={!isFormReady ? validationMessage : undefined}
            style={
              !isFormReady
                ? {
                    opacity: 0.55,
                    cursor: 'not-allowed',
                  }
                : undefined
            }
          >
            {submitting
              ? 'Enviando...'
              : requiresJustification && exceedsStandardLimit
              ? 'Enviar para análise'
              : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
};
