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
          {"일정을 알림으로 보내드려요.\n설정에서 언제든지 해제할 수 있어요."}
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
