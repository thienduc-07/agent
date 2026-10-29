import ast
import operator
from typing import Dict, Any
from backend.app.agent_runtime.tools.base import Tool, ToolResult, ToolPermissionLevel

_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

def _eval_expr(node: ast.AST):
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise TypeError("Only numbers are permitted in calculator")
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type in _SAFE_OPERATORS:
            left = _eval_expr(node.left)
            right = _eval_expr(node.right)
            return _SAFE_OPERATORS[op_type](left, right)
        raise ValueError(f"Unsupported operator: {op_type}")
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type in _SAFE_OPERATORS:
            return _SAFE_OPERATORS[op_type](_eval_expr(node.operand))
        raise ValueError(f"Unsupported unary operator: {op_type}")
    else:
        raise TypeError(f"Unsafe syntax node: {type(node)}")

class CalculatorTool:
    name: str = "calculator"
    description: str = "Perform safe mathematical and arithmetic calculations for data analysis and metrics."
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Mathematical expression to evaluate safely using AST, e.g. '(128 * 4) + 512'"
            }
        },
        "required": ["expression"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        expr = arguments.get("expression", "")
        if not expr:
            return ToolResult(success=False, output="", error="Expression cannot be empty.")
        try:
            parsed = ast.parse(expr, mode='eval')
            val = _eval_expr(parsed.body)
            return ToolResult(
                success=True,
                output=f"Calculation result for '{expr}': {val}",
                data={"expression": expr, "result": val}
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output=f"Calculation error: {str(e)}",
                error="MATH_EVAL_ERROR"
            )
