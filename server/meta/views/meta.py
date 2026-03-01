import requests
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


class CurrenciesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached = cache.get("meta_currencies")
        if cached:
            return Response(cached)

        try:
            response = requests.get("https://restcountries.com/v3.1/all?fields=currencies", timeout=10)
            response.raise_for_status()
            countries = response.json()

            currencies = {}
            for country in countries:
                for code, info in country.get("currencies", {}).items():
                    if code not in currencies:
                        currencies[code] = {
                            "code": code,
                            "name": info.get("name", code),
                            "symbol": info.get("symbol", code),
                        }

            result = sorted(currencies.values(), key=lambda x: x["code"])
            cache.set("meta_currencies", result)
            return Response(result)

        except Exception:
            return Response([])


class LanguagesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached = cache.get("meta_languages")
        if cached:
            return Response(cached)

        try:
            response = requests.get("https://restcountries.com/v3.1/all?fields=languages", timeout=10)
            response.raise_for_status()
            countries = response.json()

            languages = {}
            for country in countries:
                for code, name in country.get("languages", {}).items():
                    if code not in languages:
                        languages[code] = {"code": code, "name": name}

            result = sorted(languages.values(), key=lambda x: x["name"])
            cache.set("meta_languages", result)
            return Response(result)

        except Exception:
            return Response([])


class TimezonesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached = cache.get("meta_timezones")
        if cached:
            return Response(cached)

        try:
            response = requests.get("https://timeapi.io/api/timezone/availabletimezones", timeout=10)
            response.raise_for_status()
            timezones = response.json()

            result = [{"value": tz, "label": tz.replace("_", " ")} for tz in timezones]
            cache.set("meta_timezones", result)
            return Response(result)

        except Exception:
            return Response([])