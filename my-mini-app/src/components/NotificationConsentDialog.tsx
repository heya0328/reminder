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
      title={<ConfirmDialog.Title>알림을 보내드릴게요</ConfirmDialog.Title>}
      description={
        <ConfirmDialog.Description>
          {"등록하신 할 일을 잊지 않도록 토스 푸시로 다시 떠올려드려요.\n광고성 메시지는 보내지 않아요. 설정에서 언제든 해제할 수 있어요."}
        </ConfirmDialog.Description>
      }
      confirmButton={
        <ConfirmDialog.ConfirmButton
          size="large"
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
        >
          동의하고 시작하기
        </ConfirmDialog.ConfirmButton>
      }
      cancelButton={
        <ConfirmDialog.CancelButton size="large" onClick={onCancel}>
          취소
        </ConfirmDialog.CancelButton>
      }
    />
  );
}
