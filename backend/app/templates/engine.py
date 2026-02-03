"""Template engine for resolving industry configurations."""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from deepmerge import always_merger


class TemplateEngine:
    """Resolves final configuration from industry defaults + org overrides."""

    TEMPLATES_DIR = Path(__file__).parent / "defaults"

    @classmethod
    def load_industry_template(cls, template_id: str) -> Dict[str, Any]:
        """
        Load industry template from JSON file.

        Args:
            template_id: Industry identifier (e.g., "hospitality", "security")

        Returns:
            Template dictionary with roles, shifts, compliance_rules, etc.

        Raises:
            FileNotFoundError: If template file doesn't exist
        """
        template_path = cls.TEMPLATES_DIR / f"{template_id}.json"
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_id}")

        with open(template_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    @classmethod
    def resolve_template(
        cls,
        industry_template_id: str,
        org_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Resolve final template by merging industry defaults with org customizations.

        Args:
            industry_template_id: Industry template identifier
            org_overrides: Organization-specific customizations (from Organization.template_overrides)

        Returns:
            Merged configuration dictionary
        """
        # Load industry defaults
        industry_template = cls.load_industry_template(industry_template_id)

        # If no overrides, return industry defaults
        if not org_overrides:
            return industry_template

        # Deep merge: industry defaults + org overrides
        # org_overrides values take precedence
        merged = always_merger.merge(
            industry_template.copy(),  # Don't mutate original
            org_overrides
        )

        return merged

    @classmethod
    def get_roles(cls, industry_template_id: str, org_overrides: Optional[Dict] = None) -> list:
        """Get resolved roles for an organization."""
        template = cls.resolve_template(industry_template_id, org_overrides)
        return template.get("roles", [])

    @classmethod
    def get_shift_patterns(cls, industry_template_id: str, org_overrides: Optional[Dict] = None) -> list:
        """Get resolved shift patterns for an organization."""
        template = cls.resolve_template(industry_template_id, org_overrides)
        return template.get("shift_patterns", [])

    @classmethod
    def get_compliance_rules(cls, industry_template_id: str, org_overrides: Optional[Dict] = None) -> dict:
        """Get resolved compliance rules for an organization."""
        template = cls.resolve_template(industry_template_id, org_overrides)
        return template.get("compliance_rules", {})

    @classmethod
    def list_available_templates(cls) -> list:
        """List all available industry templates."""
        templates = []
        for template_file in cls.TEMPLATES_DIR.glob("*.json"):
            try:
                template = cls.load_industry_template(template_file.stem)
                templates.append({
                    "template_id": template_file.stem,
                    "display_name": template.get("display_name", template_file.stem),
                    "industry": template.get("industry", template_file.stem)
                })
            except (json.JSONDecodeError, KeyError):
                continue
        return sorted(templates, key=lambda x: x["display_name"])
