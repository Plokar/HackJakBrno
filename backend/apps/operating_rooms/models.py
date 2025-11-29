from django.db import models
from core.models import TimeStampedModel


class OperatingRoom(TimeStampedModel):
    """Model operačního sálu"""
    name = models.CharField(max_length=100)
    room_number = models.CharField(max_length=20, unique=True)
    floor = models.IntegerField()
    capacity = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'operating_rooms'
        ordering = ['room_number']
    
    def __str__(self):
        return f"{self.name} ({self.room_number})"


class Patient(TimeStampedModel):
    """Model pacienta"""
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    birth_number = models.CharField(max_length=20, unique=True)
    date_of_birth = models.DateField()
    diagnosis = models.TextField()
    medical_history = models.TextField(blank=True)
    
    class Meta:
        db_table = 'patients'
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Doctor(TimeStampedModel):
    """Model lékaře"""
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialization = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'doctors'
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name}"


class Equipment(TimeStampedModel):
    """Model přístrojů a vybavení"""
    name = models.CharField(max_length=200)
    equipment_code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=100)
    purchase_date = models.DateField()
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    lifetime_hours = models.IntegerField(help_text="Celková životnost v hodinách")
    used_hours = models.IntegerField(default=0, help_text="Využité hodiny")
    maintenance_date = models.DateField(null=True, blank=True)
    is_operational = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'equipment'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.equipment_code})"
    
    @property
    def hourly_depreciation(self):
        """Hodinový odpis přístroje"""
        if self.lifetime_hours > 0:
            return self.purchase_price / self.lifetime_hours
        return 0
    
    @property
    def remaining_lifetime_percent(self):
        """Zbývající životnost v procentech"""
        if self.lifetime_hours > 0:
            return max(0, ((self.lifetime_hours - self.used_hours) / self.lifetime_hours) * 100)
        return 0


class Material(TimeStampedModel):
    """Model materiálu a jednorázových pomůcek"""
    name = models.CharField(max_length=200)
    ean_code = models.CharField(max_length=13, unique=True, help_text="EAN-13 čárový kód")
    category = models.CharField(max_length=100)
    unit = models.CharField(max_length=20, help_text="Jednotka (ks, balení, atd.)")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    minimum_stock = models.IntegerField(default=10)
    is_disposable = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'materials'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.ean_code})"


class Operation(TimeStampedModel):
    """Model operace"""
    STATUS_CHOICES = [
        ('draft', 'Návrh'),  # Vytvořeno doktorem
        ('pending_approval', 'Čeká na schválení'),  # Čeká na schválení adminem
        ('approved', 'Schváleno'),  # Schváleno adminem
        ('scheduled', 'Naplánováno'),  # Přiřazen personál sestrou
        ('in_progress', 'Probíhá'),
        ('completed', 'Dokončeno'),
        ('cancelled', 'Zrušeno'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='operations')
    operating_room = models.ForeignKey(OperatingRoom, on_delete=models.PROTECT, related_name='operations', null=True, blank=True)
    primary_doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name='primary_operations', null=True, blank=True)
    assisting_doctors = models.ManyToManyField(Doctor, related_name='assisted_operations', blank=True)
    
    # Uživatel, který operaci vytvořil
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='created_operations')
    # Uživatel, který operaci schválil
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_operations')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    operation_type = models.CharField(max_length=200, blank=True)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    notes = models.TextField(blank=True)
    is_emergency = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'operations'
        ordering = ['-scheduled_start']
    
    def __str__(self):
        return f"{self.operation_type} - {self.patient} ({self.scheduled_start.strftime('%Y-%m-%d %H:%M')})"
    
    @property
    def duration_hours(self):
        """Délka operace v hodinách"""
        if self.actual_start and self.actual_end:
            delta = self.actual_end - self.actual_start
            return delta.total_seconds() / 3600
        return 0


class PerioperativeProtocol(TimeStampedModel):
    """Periopearční protokol - záznam o průběhu operace"""
    operation = models.OneToOneField(Operation, on_delete=models.CASCADE, related_name='protocol')
    
    # Použité přístroje
    equipment_used = models.ManyToManyField(Equipment, through='EquipmentUsage')
    
    # Použitý materiál
    materials_used = models.ManyToManyField(Material, through='MaterialUsage')
    
    # Záznamy z operace
    complications = models.TextField(blank=True)
    procedure_notes = models.TextField()
    anesthesia_type = models.CharField(max_length=100)
    
    # Náklady
    total_staff_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_equipment_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_material_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'perioperative_protocols'
    
    def __str__(self):
        return f"Protokol - {self.operation}"
    
    @property
    def total_cost(self):
        """Celkové náklady operace"""
        return self.total_staff_cost + self.total_equipment_cost + self.total_material_cost


class EquipmentUsage(TimeStampedModel):
    """Záznam o použití přístroje během operace"""
    protocol = models.ForeignKey(PerioperativeProtocol, on_delete=models.CASCADE)
    equipment = models.ForeignKey(Equipment, on_delete=models.PROTECT)
    hours_used = models.DecimalField(max_digits=5, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'equipment_usage'
    
    def __str__(self):
        return f"{self.equipment} - {self.hours_used}h"


class MaterialUsage(TimeStampedModel):
    """Záznam o použití materiálu během operace"""
    protocol = models.ForeignKey(PerioperativeProtocol, on_delete=models.CASCADE)
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    quantity_used = models.IntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    scanned_at = models.DateTimeField(auto_now_add=True, help_text="Čas skenování EAN kódu")
    
    class Meta:
        db_table = 'material_usage'
    
    def __str__(self):
        return f"{self.material} - {self.quantity_used} {self.material.unit}"


class OperationTool(TimeStampedModel):
    """Model pro operační nástroje a pomůcky s životností"""
    STATUS_CHOICES = [
        ('good', 'Dobrý stav'),
        ('warning', 'Varování'),
        ('critical', 'Kritický'),
    ]
    
    UNIT_CHOICES = [
        ('použití', 'Použití'),
        ('dní', 'Dní'),
        ('hodin', 'Hodin'),
    ]
    
    name = models.CharField(max_length=200, help_text="Název nástroje nebo materiálu")
    category = models.CharField(max_length=100, help_text="Kategorie (např. Všeobecná Chirurgie, Ortopedie/Trauma)")
    inventory_code = models.CharField(max_length=50, unique=True, blank=True, null=True, help_text="Fiktivní inventární kód")
    sterilization_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Cena sterilizace v Kč na použití")
    udi_code = models.CharField(max_length=200, blank=True, null=True, help_text="UDI DataMatrix kód (GS1 formát)")
    quantity = models.IntegerField(default=0, help_text="Aktuální množství na skladě")
    lifespan = models.IntegerField(blank=True, null=True, help_text="Životnost nástroje")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='použití', help_text="Jednotka životnosti")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='good', help_text="Stav zásob")
    description = models.TextField(blank=True, help_text="Dodatečný popis")
    
    class Meta:
        db_table = 'operation_tools'
        ordering = ['category', 'name']
        verbose_name = 'Operační nástroj'
        verbose_name_plural = 'Operační nástroje'
    
    def __str__(self):
        return f"{self.name} ({self.inventory_code or 'N/A'})"
    
    @property
    def is_low_stock(self):
        """Zkontroluje, zda je zásoba nízká"""
        return self.quantity < 10