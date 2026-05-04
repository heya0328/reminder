import { ConfirmDialog } from "@toss/tds-mobile";

interface NotificationConsentDialogProps {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NotificationConsentDialog({
  open,
  loading,
  onConfirm,
  onCancel,
}: NotificationConsentDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onCancel}
      title={<ConfirmDialog.Title>알림을 보낼까요?</ConfirmDialog.Title>}
      description={
        <ConfirmDialog.Description>
          {"내가 추가한 일정만 알림을 보낼게요.\n설정 페이지에서 언제든 끌 수 있어요."}
        </ConfirmDialog.Description>
      }
      confirmButton={
        <ConfirmDialog.ConfirmButton
          size="xlarge"
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
        >
          동의하고 알림 받기
        </ConfirmDialog.ConfirmButton>
      }
      cancelButton={
        <ConfirmDialog.CancelButton size="xlarge" disabled={loading} onClick={onCancel}>
          닫기
        </ConfirmDialog.CancelButton>
      }
    />
  );
}
