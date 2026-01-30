import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

interface PrivacyConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}

const PrivacyConsentCheckbox = ({
  checked,
  onCheckedChange,
  id = "privacy-consent",
}: PrivacyConsentCheckboxProps) => {
  return (
    <div className="flex items-start space-x-3 p-4 rounded-lg bg-secondary/30 border border-border">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        className="mt-0.5"
      />
      <Label
        htmlFor={id}
        className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
      >
        I consent to the processing of my data as described in the{" "}
        <Link
          to="/privacy"
          className="text-primary hover:underline"
          target="_blank"
        >
          Privacy Policy
        </Link>
        . I understand that my submission will be stored anonymously to help
        build the community rate database.
      </Label>
    </div>
  );
};

export default PrivacyConsentCheckbox;
