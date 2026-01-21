import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw } from "lucide-react";

interface VerificationStepProps {
  onVerified: () => void;
  isVerifying: boolean;
}

// Simple math-based verification
const generateChallenge = () => {
  const operations = ["+", "-", "×"];
  const op = operations[Math.floor(Math.random() * operations.length)];
  
  let a: number, b: number, answer: number;
  
  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 20) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
      break;
    default:
      a = 5;
      b = 3;
      answer = 8;
  }
  
  return {
    question: `${a} ${op} ${b}`,
    answer: answer.toString(),
  };
};

const VerificationStep = ({ onVerified, isVerifying }: VerificationStepProps) => {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const refreshChallenge = useCallback(() => {
    setChallenge(generateChallenge());
    setUserAnswer("");
    setError(false);
  }, []);

  useEffect(() => {
    // Refresh challenge if too many attempts
    if (attempts >= 3) {
      refreshChallenge();
      setAttempts(0);
    }
  }, [attempts, refreshChallenge]);

  const handleVerify = () => {
    if (userAnswer.trim() === challenge.answer) {
      onVerified();
    } else {
      setError(true);
      setAttempts((a) => a + 1);
      setUserAnswer("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div className="node-card rounded-xl p-6 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono font-semibold text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Quick Verification
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={refreshChallenge}
          className="text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Solve this simple math problem to verify you're human.
      </p>

      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3">
          <span className="font-mono text-xl font-bold text-primary">
            {challenge.question} =
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              setError(false);
            }}
            onKeyDown={handleKeyDown}
            className={`w-20 h-10 px-3 font-mono text-lg text-center rounded-md border 
              ${error ? "border-destructive bg-destructive/10" : "border-border bg-background"} 
              focus:outline-none focus:ring-2 focus:ring-primary`}
            placeholder="?"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleVerify}
          disabled={!userAnswer || isVerifying}
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Incorrect answer. Please try again.
        </p>
      )}
    </div>
  );
};

export default VerificationStep;
