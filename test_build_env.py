#!/usr/bin/env python3
"""Test build environment detection"""

import os

def is_build_environment():
    """Check if we're in a build environment (Vercel, CI/CD, etc.)"""
    import os
    return (
        os.getenv('VERCEL') == '1' or
        os.getenv('CI') == 'true' or
        os.getenv('BUILD_ENV') == 'true' or
        os.getenv('NODE_ENV') == 'production' and not os.getenv('OPENAI_API_KEY')
    )

# Test with VERCEL=1
os.environ['VERCEL'] = '1'
print(f"With VERCEL=1: {is_build_environment()}")

# Test without VERCEL
del os.environ['VERCEL']
print(f"Without VERCEL: {is_build_environment()}")

# Test with CI=true
os.environ['CI'] = 'true'
print(f"With CI=true: {is_build_environment()}")

# Test with NODE_ENV=production and no OPENAI_API_KEY
del os.environ['CI']
os.environ['NODE_ENV'] = 'production'
print(f"With NODE_ENV=production and no OPENAI_API_KEY: {is_build_environment()}")

# Test with NODE_ENV=production and OPENAI_API_KEY
os.environ['OPENAI_API_KEY'] = 'test'
print(f"With NODE_ENV=production and OPENAI_API_KEY: {is_build_environment()}")
