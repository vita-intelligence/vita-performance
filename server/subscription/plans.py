PLANS = {
    'trial': {
        'name': 'Trial',
        'price_gbp': 0,
        'limits': {
            'workers': 5,
            'workstations': 2,
            'session_history_days': 90,
        },
        'features': {
            'kiosk': True,
            'qc': True,
            'realtime': True,
        },
    },
    'starter': {
        'name': 'Starter',
        'price_gbp': 19,
        'limits': {
            'workers': 5,
            'workstations': 2,
            'session_history_days': 90,
        },
        'features': {
            'kiosk': False,
            'qc': False,
            'realtime': False,
        },
    },
    'growth': {
        'name': 'Growth',
        'price_gbp': 49,
        'limits': {
            'workers': 15,
            'workstations': 5,
            'session_history_days': 365,
        },
        'features': {
            'kiosk': True,
            'qc': False,
            'realtime': False,
        },
    },
    'pro': {
        'name': 'Pro',
        'price_gbp': 99,
        'limits': {
            'workers': 30,
            'workstations': 10,
            'session_history_days': None,  # unlimited
        },
        'features': {
            'kiosk': True,
            'qc': True,
            'realtime': True,
        },
    },
    'enterprise': {
        'name': 'Enterprise',
        'price_gbp': None,  # custom
        'limits': {
            'workers': None,  # unlimited
            'workstations': None,  # unlimited
            'session_history_days': None,  # unlimited
        },
        'features': {
            'kiosk': True,
            'qc': True,
            'realtime': True,
        },
    },
}


def get_plan(plan_key):
    return PLANS.get(plan_key, PLANS['starter'])


def get_limit(plan_key, limit_key):
    plan = get_plan(plan_key)
    return plan['limits'].get(limit_key)


def has_feature(plan_key, feature_key):
    plan = get_plan(plan_key)
    return plan['features'].get(feature_key, False)