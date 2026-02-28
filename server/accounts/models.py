from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Custom User model
    
    Fields:
    - username: 3-20 characters, alphanumeric and underscore
    - email: Required, unique (max 254 chars - Django EmailField default)
    - password: Handled by Django's auth system (min 8 chars via settings)
    """
    
    username = models.CharField(
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9_]+$',
                message='Username can only contain letters, numbers, and underscores',
                code='invalid_username'
            ),
        ],
        error_messages={
            'unique': 'A user with that username already exists.',
        },
        help_text='Required. 3-20 characters. Letters, digits and underscores only.',
    )
    
    email = models.EmailField(
        max_length=254,
        unique=True,
        error_messages={
            'unique': 'A user with that email already exists.',
        },
    )
    
    REQUIRED_FIELDS = ['email']

    @property
    def full_name(self):
        name = f'{self.first_name} {self.last_name}'.strip()
        return name if name else self.username
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.full_name