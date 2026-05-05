export default function RewardToast({ message }) {
  if (!message) return null;
  return <div className="reward-toast">{message}</div>;
}
